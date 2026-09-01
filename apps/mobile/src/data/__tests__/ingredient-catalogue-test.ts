import { IngredientCatalogueCache } from '../ingredient-catalogue-cache';
import { fetchCatalogueChildren, fetchPromotedCatalogue, searchIngredientCatalogue } from '../ingredient-catalogue-api';
import { AsyncKeyValueStore } from '../personal-profile-repository';
import { decodeCataloguePage } from '@/domain/ingredient-catalogue';
import { CatalogueStore } from '@/features/personal-profile/catalogue-store';

const PAGE={catalogueVersion:'off-test',items:[{nodeId:'en:milk',label:'Mleko',locale:'pl',breadcrumb:[],selectable:true,hasChildren:true,supportedScopes:['node','subtree']}],page:0,size:1,total:1} as const;
class MemoryStore implements AsyncKeyValueStore{values=new Map<string,string>();async getItem(key:string){return this.values.get(key)??null;}async setItem(key:string,value:string){this.values.set(key,value);}}
describe('ingredient catalogue client and cache',()=>{
 it('strictly decodes catalogue data',()=>{expect(decodeCataloguePage(PAGE)).toEqual(PAGE);expect(()=>decodeCataloguePage({...PAGE,extra:true})).toThrow();});
 it('calls promoted, children, and encoded bilingual search endpoints',async()=>{const request=jest.fn(async(_input:URL|RequestInfo,_init?:RequestInit)=>new Response(JSON.stringify(PAGE)));await fetchPromotedCatalogue({baseUrl:'http://api.test',fetch:request});await fetchCatalogueChildren('en:milk',{baseUrl:'http://api.test',fetch:request});await searchIngredientCatalogue('goat milk',{baseUrl:'http://api.test',fetch:request});expect(request.mock.calls[0][0]).toBe('http://api.test/ingredient-catalogue/promoted?locale=pl');expect(request.mock.calls[1][0]).toContain('nodeId=en%3Amilk');expect(request.mock.calls[2][0]).toContain('q=goat+milk');});
 it('atomically replaces and reads a versioned cache',async()=>{const cache=new IngredientCatalogueCache(new MemoryStore());expect(await cache.load()).toBeNull();await cache.replace(PAGE);expect((await cache.load())?.page).toEqual(PAGE);});
 it('keeps HTTP failures explicit',async()=>{await expect(fetchPromotedCatalogue({baseUrl:'http://api.test',fetch:async()=>new Response('',{status:503})})).rejects.toMatchObject({kind:'http_error',status:503});});
 it('reports fresh, stale, and unavailable promoted states without deleting cache',async()=>{const storage=new MemoryStore();const cache=new IngredientCatalogueCache(storage);const fresh=new CatalogueStore(cache,async()=>PAGE);expect(await fresh.loadPromoted()).toMatchObject({status:'ready',version:'off-test'});const stale=new CatalogueStore(cache,async()=>{throw new Error('offline');});expect(await stale.loadPromoted()).toMatchObject({status:'stale',items:PAGE.items});const unavailable=new CatalogueStore(new IngredientCatalogueCache(new MemoryStore()),async()=>{throw new Error('offline');});expect(await unavailable.loadPromoted()).toEqual({status:'error',items:[]});});
});
