let todos=[];
let filter='all';
const filters=document.querySelectorAll('[data-filter]');
const list=document.querySelector('#tasks');
function render(){
  const visible=todos.filter(t=>filter==='all'||(filter==='done'?t.done:!t.done));
  for(const button of filters)button.setAttribute('aria-pressed',String(button.dataset.filter===filter));
  list.replaceChildren();
  document.querySelector('#count').textContent=`${todos.filter(t=>!t.done).length} remaining`;
  document.querySelector('#empty').hidden=visible.length!==0;
  document.querySelector('#empty').textContent=filter==='all'?'Nothing here yet. A fresh start.':filter==='active'?'No active tasks. All caught up.':'No completed tasks yet.';
  for(const todo of visible){
    const li=document.createElement('li');li.className=todo.done?'done':'';
    const label=document.createElement('label');const input=document.createElement('input');input.type='checkbox';input.checked=todo.done;
    const title=document.createElement('span');title.textContent=todo.title;label.append(input,title);li.append(label);list.append(li);
    input.addEventListener('change',()=>save({id:todo.id}));
  }
}
for(const button of filters)button.addEventListener('click',()=>{filter=button.dataset.filter;render();});
async function save(body){
  try{const response=await fetch('/api/todos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw Error('Could not save. Please try again.');todos=await response.json();document.querySelector('#error').textContent='';render();return true;}
  catch(error){document.querySelector('#error').textContent=error.message;render();return false;}
}
document.querySelector('#add-form').addEventListener('submit',async event=>{event.preventDefault();const input=document.querySelector('#new-task');if(await save({title:input.value}))input.value='';});
try{const response=await fetch('/api/todos');if(!response.ok)throw Error('Could not load tasks.');todos=await response.json();render();}catch(error){document.querySelector('#error').textContent=error.message;}
