import { AsyncKeyValueStore, PERSONAL_PROFILE_KEYS, TwoSlotPersonalProfileRepository } from '../personal-profile-repository';
import { decodePersonalProfile, encodePersonalProfile } from '../personal-profile-codec';
import { AvoidedIngredientProfile, emptyAvoidedIngredientProfile } from '@/domain/avoided-ingredients/profile';

const PROFILE:AvoidedIngredientProfile={selections:[{nodeId:'en:milk',labelPl:'Mleko',scope:'subtree'}],customIngredients:[{id:'one',name:'Inulina'}]};
class MemoryStore implements AsyncKeyValueStore{values=new Map<string,string>();async getItem(key:string){return this.values.get(key)??null;}async setItem(key:string,value:string){this.values.set(key,value);}}
describe('personal profile v2 persistence',()=>{
 it('strictly round-trips schema v2',()=>expect(decodePersonalProfile(encodePersonalProfile(PROFILE))).toEqual({ok:true,document:{schemaVersion:2,profile:PROFILE}}));
 it('rejects v1 in the v2 decoder',()=>expect(decodePersonalProfile(JSON.stringify({schemaVersion:1,profile:{selectedPredefinedIds:[],customIngredients:[]}}))).toEqual({ok:false,reason:'unsupported_version'}));
 it('retains v1 and creates an empty v2 with a one-time reset result',async()=>{const storage=new MemoryStore();storage.values.set(PERSONAL_PROFILE_KEYS.legacyActive,'a');storage.values.set(PERSONAL_PROFILE_KEYS.legacyA,JSON.stringify({schemaVersion:1,profile:{selectedPredefinedIds:['milk'],customIngredients:[]}}));const repository=new TwoSlotPersonalProfileRepository(storage);await expect(repository.load()).resolves.toEqual({kind:'reset',profile:emptyAvoidedIngredientProfile()});expect(storage.values.get(PERSONAL_PROFILE_KEYS.legacyA)).toBeDefined();await expect(repository.load()).resolves.toEqual({kind:'loaded',profile:emptyAvoidedIngredientProfile()});});
 it('alternates verified v2 slots',async()=>{const storage=new MemoryStore();const repository=new TwoSlotPersonalProfileRepository(storage);await repository.save(PROFILE);expect(storage.values.get(PERSONAL_PROFILE_KEYS.active)).toBe('a');await repository.save(emptyAvoidedIngredientProfile());expect(storage.values.get(PERSONAL_PROFILE_KEYS.active)).toBe('b');});
});
