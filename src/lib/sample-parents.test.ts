import {expect,it} from 'vitest';
import {parentPayload,normalizeParentFields} from './sample-parents';
import {sampleDetailPayload,samplePayload} from './samples';
import {parseSampleImport} from './sample-import';
it('distinguishes omitted updates from explicitly clearing all four fields',()=>{
 expect(parentPayload({})).toEqual({});
 expect(parentPayload({fatherSampleInternalId:'',motherSampleInternalId:'',fatherAffectedStatus:'',motherAffectedStatus:''})).toEqual({father_sample_internal_id:'',mother_sample_internal_id:'',father_affected_status:'',mother_affected_status:''});
 expect(sampleDetailPayload({fatherSampleInternalId:'DAD',fatherAffectedStatus:'carrier'})).not.toHaveProperty('father_sample_internal_id');
 expect(normalizeParentFields({father_sample_internal_id:'renamed',father_affected_status:'carrier',father:{state:'found',id:'stable'}})).toMatchObject({fatherSampleInternalId:'renamed',fatherAffectedStatus:'carrier',father:{id:'stable'}});
});
it('accepts old templates without writing parent fields',()=>{
 const result=parseSampleImport('Sample ID,Internal ID,Sex,Sample type,Batch,Clinical diagnosis,Father sample,Mother sample,Father status,Mother status\nS,C,male,DNA,,,DAD,MOM,carrier,\n');
 expect(result.issues).toEqual([]);
 const payload = samplePayload(result.rows[0].data);
 expect(payload).toMatchObject({internal_id:'C',sample_type:'DNA'});
 expect(payload).not.toHaveProperty('father_sample_internal_id');
 expect(payload).not.toHaveProperty('mother_affected_status');
 expect(payload).not.toHaveProperty('hpo_terms');
});
