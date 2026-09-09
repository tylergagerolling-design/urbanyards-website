const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');

function functionSource(name) {
  const start = source.search(new RegExp(`  (?:async )?function ${name}\\(`));
  assert.ok(start >= 0, `${name} exists`);
  return source.slice(start, source.indexOf('\n  }', start) + 4);
}

function moneyLoader(request) {
  const state = { moneyView:'expenses', moneyLoadedViews:new Set(), moneyLoading:false, moneyError:'', data:{financial:{}} };
  const context = vm.createContext({ state, isDemoMode:()=>false, renderMoneyWorkspace:()=>{}, dashboardFinancialRequest:request, normalizeExpense:row=>row, financialDateRange:()=>({start:'2026-09-01',end:'2026-09-08'}) });
  vm.runInContext(`const moneyViewRequests = new Map(); ${functionSource('loadMoneyView')}`, context);
  return {state,load:context.loadMoneyView};
}

test('Money loads expenses and vendors concurrently and coalesces repeated tab requests', async () => {
  const requests=[];
  const pending=new Map();
  const {state,load}=moneyLoader(action=>{requests.push(action);return new Promise(resolve=>pending.set(action,resolve));});
  const first=load('expenses');
  const duplicate=load('expenses');
  await Promise.resolve();
  assert.deepEqual(requests,['list-expenses','list-vendors']);
  pending.get('list-expenses')([{id:'expense-1'}]);
  pending.get('list-vendors')([{id:'vendor-1'}]);
  await Promise.all([first,duplicate]);
  assert.equal(state.data.financial.expenses[0].id,'expense-1');
  assert.equal(state.moneyLoading,false);
  await load('expenses');
  assert.equal(requests.length,2);
});

test('Switching Money tabs does not wait for an unrelated slow request or surface its error', async () => {
  let rejectExpenses;
  const {state,load}=moneyLoader(action=>action==='list-expenses' ? new Promise((_,reject)=>rejectExpenses=reject) : Promise.resolve([{id:action}]));
  const expenses=load('expenses');
  await Promise.resolve();
  state.moneyView='invoicing';
  await load('invoicing');
  assert.equal(state.data.financial.invoices[0].id,'list-invoices');
  assert.equal(state.moneyLoading,false);
  rejectExpenses(new Error('Expense service unavailable'));
  await expenses;
  assert.equal(state.moneyError,'');
  assert.equal(state.moneyLoadedViews.has('expenses'),false);
});

test('Failed active Money views can be retried', async () => {
  let fail=true;
  const {state,load}=moneyLoader(action=>action==='list-expenses' && fail ? Promise.reject(new Error('Try again')) : Promise.resolve([]));
  await load('expenses');
  assert.equal(state.moneyError,'Try again');
  fail=false;
  await load('expenses',{force:true});
  assert.equal(state.moneyError,'');
  assert.equal(state.moneyLoadedViews.has('expenses'),true);
});

test('Returning to a cached Money tab clears the loading indicator for another view', async () => {
  let resolveExpenses;
  const {state,load}=moneyLoader(action=>action==='list-expenses' ? new Promise(resolve=>resolveExpenses=resolve) : Promise.resolve([]));
  state.moneyLoadedViews.add('invoicing');
  const expenses=load('expenses');
  await Promise.resolve();
  assert.equal(state.moneyLoading,true);
  state.moneyView='invoicing';
  await load('invoicing');
  assert.equal(state.moneyLoading,false);
  resolveExpenses([]);
  await expenses;
});

test('Money renders placeholders on its first frame and keeps failures retryable', () => {
  const state = { moneyView:'invoicing', moneyLoading:false, moneyError:'', moneyLoadedViews:new Set() };
  const context = vm.createContext({state, escapeHtml:String, MONEY_TABS:[{key:'invoicing',label:'Invoicing'}], renderUnifiedMoneyInvoiceWorkspace:()=>'<section>Loaded invoices</section>'});
  vm.runInContext(functionSource('renderMoneyLoadingView')+functionSource('renderMoneyActiveView'),context);
  assert.match(context.renderMoneyActiveView(),/Loading invoices/);
  assert.doesNotMatch(context.renderMoneyActiveView(),/\$0\.00|No invoices/);
  state.moneyError='Request failed';
  assert.match(context.renderMoneyActiveView(),/role="alert"[\s\S]*retry-money-view/);
  state.moneyLoading=true;
  assert.match(context.renderMoneyActiveView(),/Loading invoices/);
  state.moneyLoading=false;
  state.moneyError='';
  state.moneyLoadedViews.add('invoicing');
  assert.match(context.renderMoneyActiveView(),/Loaded invoices/);
});

test('Money keeps its header and tabs while loading without the retired banner or date selector', () => {
  const state = { moneyView:'invoicing', moneyLoadedViews:new Set(['invoicing']) };
  const info = {status:'loading'};
  const target = {};
  const context = vm.createContext({state, moneyViewRequests:new Map(), qs:()=>target, dashboardSectionLoadInfo:()=>info, isDemoMode:()=>false, renderWorkspaceDataState:()=>'<aside class="workspace-data-state is-warning">Retry</aside>', canManageMoneyWorkflow:()=>true, renderQaShowcasePanel:()=>'', renderMoneyTabs:()=>'<nav class="money-tabs">Invoices</nav>', renderMoneyActiveView:()=>'<section>Records</section>'});
  vm.runInContext(functionSource('renderMoneyWorkspace'),context);
  context.renderMoneyWorkspace();
  assert.match(target.innerHTML,/<h1>Money<\/h1>/);
  assert.match(target.innerHTML,/class="money-tabs"/);
  assert.doesNotMatch(target.innerHTML,/workspace-data-state|money-period/);
  info.status='partial';
  context.renderMoneyWorkspace();
  assert.match(target.innerHTML,/money-tabs[\s\S]*is-warning/);
});

test('Quote revisions retain discounted pricing, tax, deposit and multiline terms', () => {
  const previous={lineItems:[{description:'Mow',quantity:2,unit_price:175,amount:350},{description:'Discount',quantity:1,unit_price:-50,amount:-50}],subtotal:300,tax:30,notes:'Deposit requested: 25%.\nTerms: First condition\nSecond condition\nCustomer message: Thank you\nSee you soon'};
  const context=vm.createContext({findQuoteForTicket:()=>previous,escapeHtml:String,addDaysKey:()=>'',todayKey:()=>'',buttonContent:String});
  vm.runInContext(functionSource('renderQuoteLineInput')+functionSource('renderFinancialQuoteForm'),context);
  const html=context.renderFinancialQuoteForm({id:'ticket-1'});
  assert.match(html,/name="discount"[^>]*value="50"/);
  assert.match(html,/name="tax_rate"[^>]*value="10"/);
  assert.match(html,/name="deposit_percent"[^>]*value="25"/);
  assert.match(html,/>First condition\nSecond condition<\/textarea>/);
  assert.match(html,/>Thank you\nSee you soon<\/textarea>/);
  assert.equal((html.match(/data-quote-line>/g)||[]).length,1);
});

test('Approving a quote changes only status in the database request', async () => {
  const existing={id:'quote-1',type:'estimate',lineItems:[{description:'Mow',quantity:2,unit_price:175}],subtotal:350,tax:35,total:385,notes:'Original terms'};
  const state={data:{documents:[existing]}};
  let captured;
  const context=vm.createContext({state,isDemoMode:()=>false,normalizeDocument:row=>row,supabaseRestRequest:async (url,options)=>{captured={url,options};return [{...existing,status:'approved'}];}});
  vm.runInContext(functionSource('approveSalesDocument'),context);
  await context.approveSalesDocument('quote-1');
  assert.equal(captured.url,'sales_documents?id=eq.quote-1');
  assert.deepEqual(JSON.parse(captured.options.body),{status:'approved'});
  assert.deepEqual(state.data.documents[0].lineItems,existing.lineItems);
  assert.equal(state.data.documents[0].tax,35);
  assert.equal(state.data.documents[0].total,385);
  assert.equal(state.data.documents[0].notes,'Original terms');
});

test('Approval does not report success when the database returns no updated record', async () => {
  const state={data:{documents:[{id:'quote-1',type:'estimate',status:'draft'}]}};
  const context=vm.createContext({state,isDemoMode:()=>false,supabaseRestRequest:async()=>[]});
  vm.runInContext(functionSource('approveSalesDocument'),context);
  await assert.rejects(context.approveSalesDocument('quote-1'),/not saved/);
  assert.equal(state.data.documents[0].status,'draft');
});

test('Money builds linked ticket names once per render instead of once per row', () => {
  let calls=0;
  const context=vm.createContext({state:{data:{}},dashboardTickets:()=>{calls++;return [{id:'ticket-1',sourceId:'lead-1',number:'TKT-100'}];}});
  vm.runInContext(`let moneyRenderNames = new Map(); ${functionSource('financialRecordName')}`,context);
  for(let i=0;i<1000;i++) assert.equal(context.financialRecordName('ticket','lead-1'),'TKT-100');
  assert.equal(calls,1);
  assert.equal(context.financialRecordName('ticket','unlinked'),'unlinked');
});
