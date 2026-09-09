const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');

function code(name) {
  const start = source.search(new RegExp(`  (?:async )?function ${name}\\(`));
  assert.ok(start >= 0, `${name} exists`);
  return source.slice(start, source.indexOf('\n  }', start) + 4);
}
const escapeHtml = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function addDaysKey(value, count) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0,10);
}
function context(functions, values) {
  const ctx = vm.createContext({escapeHtml, addDaysKey, todayKey:()=> '2026-09-08', ...values});
  vm.runInContext(functions.map(code).join('\n'), ctx);
  return ctx;
}

test('Call Queue settings validate saved values and survive unavailable browser storage', () => {
  let saved = JSON.stringify({default_status:'Follow-Up Needed',source_label:'  Referral  ',phone_format:'e164'});
  const c = context(['readCallQueueSettings','callQueuePhoneInfo'], {
    OUTREACH_STATUSES:['Prospect','Follow-Up Needed'],
    localStorage:{getItem:()=>saved},
    phoneInfo:()=>({valid:true,display:'(503) 555-0100',e164:'+15035550100'})
  });
  assert.equal(c.readCallQueueSettings().default_status,'Follow-Up Needed');
  assert.equal(c.readCallQueueSettings().source_label,'Referral');
  assert.equal(c.callQueuePhoneInfo('5035550100').display,'+15035550100');
  saved = JSON.stringify({default_status:'Invalid',source_label:42,phone_format:'Invalid'});
  assert.equal(c.readCallQueueSettings().default_status,'Prospect');
  assert.equal(c.callQueuePhoneInfo('5035550100').display,'(503) 555-0100');
  saved = '{invalid';
  assert.equal(c.readCallQueueSettings().phone_format,'national');
  c.localStorage.getItem = () => {throw new Error('Storage unavailable');};
  assert.equal(c.readCallQueueSettings().default_status,'Prospect');
});

test('Business today and relative dates stay in Pacific time after UTC midnight', () => {
  let instant = '2026-09-09T03:00:00Z';
  class FixedDate extends Date { constructor(value) { super(value === undefined ? instant : value); } }
  const c = context(['todayKey','daysFromToday'], {Date:FixedDate});
  assert.equal(c.todayKey(),'2026-09-08');
  assert.equal(c.daysFromToday(1),'2026-09-09');
  instant = '2027-01-01T04:00:00Z';
  assert.equal(c.todayKey(),'2026-12-31');
  assert.equal(c.daysFromToday(1),'2027-01-01');
  instant = '2026-09-09T08:00:00Z';
  assert.equal(c.todayKey(),'2026-09-09');
});

test('Missing weather readings stay unknown while real zero readings remain visible', () => {
  const c = context(['homeWeatherNumber','homeWeatherTemperature','renderHomeWeatherDay'], {
    homeWeatherIconSource:()=> 'images/weather-icon-pack/png-128/cloudy.png',homeWeatherControlIcon:()=>''
  });
  for (const value of [null,undefined,'',' ']) assert.equal(c.homeWeatherTemperature(value,'F'),'—');
  assert.equal(c.homeWeatherTemperature(0,'F'),'0°F');
  const unknown = c.renderHomeWeatherDay({daytimeTemperature:null,nighttimeTemperature:56,probabilityOfPrecipitation:null});
  assert.match(unknown,/H —/);
  assert.match(unknown,/L 56°F/);
  assert.match(unknown,/Rain<\/dt><dd>—/);
  assert.match(c.renderHomeWeatherDay({probabilityOfPrecipitation:0}),/Rain<\/dt><dd>0%/);
});

test('Import tools distinguish pending loading from a failed request', () => {
  const main = {}, status = {}, snapshot = {modules:[]}, info = {status:'loading'};
  const state = {importExportReady:false,importExportError:'',importExportView:'import'};
  const c = context(['renderImportExport'], {
    state,els:{importExportMain:main,importExportStatus:status},importExportSnapshot:()=>snapshot,
    dashboardSectionLoadInfo:()=>info,qsa:()=>[],loadingState:message=>`Loading: ${message}`,emptyState:message=>`Empty: ${message}`
  });
  c.renderImportExport();
  assert.match(main.innerHTML,/^Loading:/);
  assert.doesNotMatch(main.innerHTML,/could not|SQL tables/);
  info.status = 'failed';
  state.importExportError = 'Network unavailable';
  c.renderImportExport();
  assert.match(main.innerHTML,/could not load/);
  assert.doesNotMatch(main.innerHTML,/^Loading:/);
});

test('Default route duration satisfies its native number input constraints', () => {
  const content = {};
  const c = context(['openRouteStopDrawer'], {
    state:{},els:{detailContent:content},ROUTE_STATUSES:['Planned'],formatDate:v=>v,
    qs:()=>null,openDetailDrawer:()=>{},initAddressAutocomplete:()=>{}
  });
  c.openRouteStopDrawer('2026-09-09');
  const input = content.innerHTML.match(/<input name="estimated_minutes"[^>]*>/)?.[0];
  assert.ok(input);
  const attr = name => Number(input.match(new RegExp(`${name}="([^"]+)"`))[1]);
  assert.ok(attr('value') >= attr('min'));
  assert.equal((attr('value')-attr('min'))%attr('step'),0);
});

test('Call Queue contact details escape record text while preserving safe website links', () => {
  const c = context(['renderCallQueueReferenceDrawer'], {
    state:{callQueueDrawerTab:'details'},callQueuePhoneInfo:()=>({valid:false,display:'No phone'}),
    callQueueWebsite:()=> 'https://example.com',callQueueWebsiteLabel:()=> 'example.com',
    callQueueHistory:()=>[],outreachTitle:()=> 'Sample lead',slug:()=> 'prospect',
    canCreateTicketType:()=>true,canDeleteLeadRecords:()=>false,formatDate:v=>v
  });
  const attack = '<img src=x onerror="alert(1)">';
  const html = c.renderCallQueueReferenceDrawer({id:'sample',status:'Prospect',address:attack,source:attack,lastContactedAt:attack});
  assert.doesNotMatch(html,/<img/);
  assert.match(html,/&lt;img/);
  assert.match(html,/<a href="https:\/\/example.com"/);
});

test('This Week includes Monday through Sunday and handles year boundaries', () => {
  const c = context(['dashboardDateInWeek'], {});
  for (const date of ['2026-09-07','2026-09-08','2026-09-13']) assert.equal(c.dashboardDateInWeek(date),true);
  for (const date of ['2026-09-06','2026-09-14','','unknown']) assert.equal(c.dashboardDateInWeek(date),false);
  assert.equal(c.dashboardDateInWeek('2025-12-29','2026-01-01'),true);
  assert.equal(c.dashboardDateInWeek('2026-01-04','2026-01-01'),true);
  assert.equal(c.dashboardDateInWeek('2026-01-05','2026-01-01'),false);
});

test('Work date filters change rendered jobs and give an explicit empty result', () => {
  const state = {workListRange:'week'};
  const host = {};
  const rows = [{id:'this-week',dateRaw:'2026-09-09',city:'Portland',status:'Scheduled',priority:'High'}, {id:'next-week',dateRaw:'2026-09-16',city:'Portland',status:'Scheduled',priority:'Low'}, {id:'unscheduled',dateRaw:'',city:'Portland',status:'Unscheduled',priority:'Low'}];
  const c = context(['dashboardDateInWeek','renderWorkOperationsWorkspace'], {state, qs:()=>host, workOperationsRows:()=>rows, unifiedTicketIcon:()=>'', renderWorkFocusPanel:()=>'', renderWorkOperationsRow:job=>`<tr data-id="${job.id}"></tr>`});
  c.renderWorkOperationsWorkspace();
  assert.match(host.innerHTML,/data-id="this-week"/);
  assert.doesNotMatch(host.innerHTML,/data-id="next-week"|data-id="unscheduled"/);
  state.workListRange = 'all';
  c.renderWorkOperationsWorkspace();
  assert.match(host.innerHTML,/data-id="next-week"/);
  assert.match(host.innerHTML,/data-id="unscheduled"/);
  state.workListStatus = 'Completed';
  c.renderWorkOperationsWorkspace();
  assert.match(host.innerHTML,/No jobs match these filters/);
});

test('Work renders user text as text and gives zero-task jobs a finite progress value', () => {
  const c = context(['renderWorkOperationsRow'], {workRowProgress:()=>0, slug:v=>v.toLowerCase().replace(/[^a-z0-9]+/g,'-')});
  const attack = '<img src=x onerror="window.qaExecuted=true">';
  const html = c.renderWorkOperationsRow({id:'id" onclick="alert(1)',job:attack,customer:attack,address:attack,city:attack,crew:[attack],extra:attack,attention:attack,total:0,status:'Scheduled',priority:'High'});
  assert.doesNotMatch(html, /<img|data-id="id" onclick=|NaN|Infinity/);
  assert.match(html,/&lt;img/);
  assert.match(html,/width:0%/);
  assert.match(html,/0 \/ 0 tasks/);
});

test('Demo notes are retained on their ticket without a database request', async () => {
  const state = {data:{notes:[]}};
  const events = [];
  const c = context(['normalizeNote','saveApprovedTicketNote','renderTicketNoteList'], {state,isDemoMode:()=>true,nextDemoId:()=> 'note-1',formatDate:v=>v,insertJobTicketEvent:async (...args)=>events.push(args),supabaseRestRequest:()=>{throw new Error('Must not use database');}});
  await c.saveApprovedTicketNote('ticket-1','Gate code <1234>\nUse rear entrance');
  assert.equal(state.data.notes.length,1);
  assert.equal(state.data.notes[0].ticketId,'ticket-1');
  assert.match(c.renderTicketNoteList('ticket-1'),/Gate code &lt;1234&gt;\nUse rear entrance/);
  assert.doesNotMatch(c.renderTicketNoteList('ticket-2'),/Gate code/);
  assert.equal(events[0][0],'ticket-1');
});

test('An empty note-save response cannot be reported as success', async () => {
  const state = {data:{notes:[]}};
  const c = context(['saveApprovedTicketNote'], {state,isDemoMode:()=>false,supabaseRestRequest:async ()=>[]});
  await assert.rejects(c.saveApprovedTicketNote('ticket-1','A note'),/not saved/);
  assert.equal(state.data.notes.length,0);
});

test('Failed notes retain entered text and allow a successful retry', async () => {
  const input={value:'Please close the gate'};
  const button={disabled:false};
  const status={textContent:''};
  const form={dataset:{ticketId:'ticket-1'},querySelector:s=>s==='textarea'?input:button,reset:()=>{input.value='';}};
  let fail=true, renders=0;
  const c=context(['submitTicketNoteForm'],{qs:()=>status,saveApprovedTicketNote:async()=>{if(fail)throw new Error('Offline');},renderUnifiedTicketOverview:()=>renders++});
  await c.submitTicketNoteForm(form,'ticket');
  assert.equal(button.disabled,false);
  assert.equal(input.value,'Please close the gate');
  assert.equal(status.textContent,'Offline');
  fail=false;
  await c.submitTicketNoteForm(form,'ticket');
  assert.equal(input.value,'');
  assert.equal(status.textContent,'Note saved.');
  assert.equal(renders,1);
});

test('Repeated note submits share the pending form state', async () => {
  let resolve, saves=0;
  const input={value:'A single note'},button={disabled:false};
  const form={dataset:{ticketId:'ticket-1'},querySelector:s=>s==='textarea'?input:button,reset:()=>{}};
  const c=context(['submitTicketNoteForm'],{qs:()=>({}),saveApprovedTicketNote:()=>{saves++;return new Promise(r=>resolve=r);},renderWorkOperationsWorkspace:()=>{}});
  const first=c.submitTicketNoteForm(form,'work');
  await c.submitTicketNoteForm(form,'work');
  assert.equal(saves,1);
  resolve();
  await first;
  assert.equal(button.disabled,false);
});

test('Search renders retain the selection without stealing focus or reopening closed inputs', () => {
  const input={isConnected:true,selectionStart:2,selectionEnd:5};
  const document={activeElement:input};
  let focused=0,rendered=0,selection;
  const replacement={focus:()=>focused++,setSelectionRange:(...values)=>selection=values};
  const c=context(['renderKeepingInputFocus'],{document,qs:()=>replacement});
  c.renderKeepingInputFocus(input,'input',()=>rendered++);
  assert.equal(focused,1);
  assert.deepEqual(selection,[2,5]);
  document.activeElement={};
  c.renderKeepingInputFocus(input,'input',()=>rendered++);
  assert.equal(focused,1);
  input.isConnected=false;
  c.renderKeepingInputFocus(input,'input',()=>rendered++);
  assert.equal(rendered,2);
});
