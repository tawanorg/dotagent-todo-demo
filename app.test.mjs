import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Minimal DOM boundary: run the real client and interact through its controls.
class Element {
  children=[]; listeners={}; attributes={}; dataset={}; textContent='';
  append(...children){this.children.push(...children);}
  replaceChildren(){this.children=[];}
  setAttribute(name,value){this.attributes[name]=value;}
  addEventListener(name,callback){this.listeners[name]=callback;}
  async fire(name){await this.listeners[name]?.({preventDefault(){}});}
}
const source=await readFile(new URL('./app.js',import.meta.url),'utf8');
test('filters preserve tasks and global count, and completion updates the selected view',async()=>{
  const elements=Object.fromEntries(['tasks','count','empty','error','add-form','new-task'].map(id=>[id,new Element()]));
  const buttons=['all','active','done'].map(filter=>Object.assign(new Element(),{dataset:{filter}}));
  let stored=[{id:'one',title:'Synthetic finished task',done:true},{id:'two',title:'Synthetic active task',done:false}];
  let writes=0;
  await vm.runInNewContext(`(async()=>{${source}\n})()`,{
    document:{querySelector:selector=>elements[selector.slice(1)],querySelectorAll:()=>buttons,createElement:()=>new Element()},
    fetch:async(_url,options)=>{
      if(options){writes++;const body=JSON.parse(options.body);stored=stored.map(t=>t.id===body.id?{...t,done:!t.done}:t);}
      return {ok:true,json:async()=>structuredClone(stored)};
    },
  });
  const titles=()=>elements.tasks.children.map(li=>li.children[0].children[1].textContent);
  assert.deepEqual(titles(),['Synthetic finished task','Synthetic active task']);
  for(const [index,expected] of [[1,['Synthetic active task']],[2,['Synthetic finished task']],[0,['Synthetic finished task','Synthetic active task']]]){
    await buttons[index].fire('click');
    assert.deepEqual(titles(),expected);
    assert.equal(elements.count.textContent,'1 remaining');
    assert.deepEqual(buttons.map(b=>b.attributes['aria-pressed']),buttons.map((_,i)=>String(i===index)));
  }
  assert.equal(writes,0);
  await buttons[1].fire('click');
  await elements.tasks.children[0].children[0].children[0].fire('change');
  assert.deepEqual(titles(),[]);
  assert.equal(elements.empty.hidden,false);
  assert.equal(elements.empty.textContent,'No active tasks. All caught up.');
  assert.equal(elements.count.textContent,'0 remaining');
  await buttons[2].fire('click');
  assert.deepEqual(titles(),['Synthetic finished task','Synthetic active task']);
  assert.equal(stored[1].done,true);
});
