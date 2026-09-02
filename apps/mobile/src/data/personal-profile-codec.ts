import { AvoidedIngredientProfile, validateAvoidedIngredientProfile } from '@/domain/avoided-ingredients/profile';

export const PERSONAL_PROFILE_SCHEMA_VERSION = 2;
export type PersonalProfileDocument = { schemaVersion: 2; profile: AvoidedIngredientProfile };
export type ProfileDecodeResult = { ok: true; document: PersonalProfileDocument } | { ok: false; reason: 'invalid_json' | 'invalid_document' | 'unsupported_version' };
export function encodePersonalProfile(profile: AvoidedIngredientProfile): string { const error=validateAvoidedIngredientProfile(profile); if(error) throw new Error(`Cannot encode invalid personal profile: ${error.code}`); return JSON.stringify({schemaVersion:2,profile}); }
export function decodePersonalProfile(value: string): ProfileDecodeResult {
  let parsed: unknown; try { parsed=JSON.parse(value); } catch { return {ok:false,reason:'invalid_json'}; }
  if(!record(parsed)||!keys(parsed,['schemaVersion','profile'])) return {ok:false,reason:'invalid_document'};
  if(parsed.schemaVersion!==2) return {ok:false,reason:'unsupported_version'};
  const profile=decodeProfile(parsed.profile); return profile&&!validateAvoidedIngredientProfile(profile)?{ok:true,document:{schemaVersion:2,profile}}:{ok:false,reason:'invalid_document'};
}
export function isV1PersonalProfile(value:string):boolean { try { const parsed:unknown=JSON.parse(value); return record(parsed)&&parsed.schemaVersion===1&&record(parsed.profile); } catch{return false;} }
function decodeProfile(value:unknown):AvoidedIngredientProfile|null {
  if(!record(value)||!keys(value,['selections','customIngredients'])||!Array.isArray(value.selections)||!Array.isArray(value.customIngredients)) return null;
  const selections:{nodeId:string;labelPl:string;scope:'node'|'subtree';ancestorNodeIds:string[]}[]=[];
  for(const item of value.selections){
    if(!record(item)||(!keys(item,['nodeId','labelPl','scope'])&&!keys(item,['nodeId','labelPl','scope','ancestorNodeIds']))||typeof item.nodeId!=='string'||typeof item.labelPl!=='string'||(item.scope!=='node'&&item.scope!=='subtree')) return null;
    const ancestorNodeIds=item.ancestorNodeIds===undefined?[]:item.ancestorNodeIds;
    if(!Array.isArray(ancestorNodeIds)||ancestorNodeIds.some((id)=>typeof id!=='string')) return null;
    selections.push({nodeId:item.nodeId,labelPl:item.labelPl,scope:item.scope,ancestorNodeIds:[...new Set(ancestorNodeIds)]});
  }
  const customIngredients:{id:string;name:string}[]=[];
  for(const item of value.customIngredients){if(!record(item)||!keys(item,['id','name'])||typeof item.id!=='string'||typeof item.name!=='string') return null; customIngredients.push({id:item.id,name:item.name});}
  return {selections,customIngredients};
}
function record(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function keys(value:Record<string,unknown>,expected:string[]){const actual=Object.keys(value).sort();const wanted=[...expected].sort();return actual.length===wanted.length&&actual.every((key,index)=>key===wanted[index]);}
