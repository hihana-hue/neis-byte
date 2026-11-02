import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import vm from 'node:vm';

const root = new URL('../edu/gogeon-word/apps-script/', import.meta.url);
const sources = readdirSync(root).filter(name => name.endsWith('.gs'));
const stored = new Map();
const properties = {
  getProperty: key => stored.get(key) ?? null,
  setProperty: (key, value) => stored.set(key, value),
};
const context = vm.createContext({
  PropertiesService: {getScriptProperties: () => properties},
});
for (const file of sources) {
  vm.runInContext(readFileSync(new URL(file, root), 'utf8'), context, {filename: file});
}

// Apps Script exposes top-level functions without a trailing underscore to RPC.
const publicFunctions = sources.flatMap(file =>
  [...readFileSync(new URL(file, root), 'utf8').matchAll(/^function (\w+)\(/gm)]
    .map(match => match[1]).filter(name => !name.endsWith('_'))
).sort();
assert.deepEqual(publicFunctions, [
  'doGet', 'examRecordingReady', 'logout', 'mariCheck', 'mariReplaceDevice',
  'mariRestore', 'mariSave', 'mariSignIn', 'recordProgress', 'saveEconomy',
  'saveExam', 'saveLearning', 'signOut',
].sort());
for (const name of ['setupDeviceLimits', 'setupDeviceManagement', 'setupAppPermissions', 'setupGyodaeSheet', 'login']) {
  assert.equal(context[name], undefined, `${name} must not be an RPC entry point`);
  assert.equal(typeof context[name + '_'], 'function');
}

let permissions = {};
let activeToken = 'valid-session';
let account = () => ({id: 'student-a', permissions});
let visits = 0;
let counts = 0;
let depth = 0;
context.lock_ = fn => {
  assert.equal(depth, 0, 'legacy wrappers must not acquire a nested script lock');
  depth++;
  try { return fn(); } finally { depth--; }
};
context.session_ = token => {
  if (token !== activeToken) throw Error('다시 로그인하세요.');
  return {a: account(), s: {}, layout: {}};
};
context.cardIds_ = () => ['c_one'];
context.economyCorpus_ = () => ({data: [{id: 'e_one'}]});
context.hash_ = value => String(value);
context.visitRecord_ = () => visits++;
context.mariLearningCounts_ = () => counts++;
const learning = id => ({type: 'progress', eventId: 'event-123456', completed: [id], revision: 0});
const exam = {type: 'start', visitId: 'visit-123456', eventId: 'event-123456'};
const entryPoints = [
  ['recordProgress', 'classic', learning('c_one')],
  ['saveLearning', 'classic', learning('c_one')],
  ['saveEconomy', 'economy', learning('e_one')],
  ['saveExam', 'hanmun', exam],
];

for (const [method, app, event] of entryPoints) {
  stored.clear(); visits = 0; counts = 0;
  // A valid session for a different app cannot write or log a visit.
  permissions = {gyodae: true};
  assert.throws(() => context[method]('valid-session', event), /이용 권한/);
  assert.equal(stored.size, 0);
  assert.equal(visits, 0);
  assert.equal(counts, 0);
  permissions = {[app]: true};
  assert.throws(() => context[method]('expired-session', event), /로그인/);
  const result = context[method]('valid-session', event);
  assert.equal(result.ok, true);
  assert.equal(visits, 1);
  assert.equal(counts, 1);
  // Removing permission takes effect even when the session token is unchanged.
  permissions = {};
  const before = JSON.stringify([...stored]);
  assert.throws(() => context[method]('valid-session', event), /이용 권한/);
  assert.equal(JSON.stringify([...stored]), before);
  assert.equal(visits, 1);
}

// Current routes also reject absent, unknown and inherited-property app names.
permissions = {classic: true};
for (const app of [undefined, '', 'unknown', '__proto__', 'constructor']) {
  assert.throws(() => context.mariSave('valid-session', learning('c_one'), app), /앱 설정/);
}
assert.throws(() => context.mariSave('valid-session', exam, 'hanmun'), /이용 권한/);
assert.throws(() => context.mariCheck('valid-session', 'economy'), /이용 권한/);
permissions = {};
assert.throws(() => context.saveClassic_(account(), learning('c_one')), /이용 권한/);
assert.throws(() => context.saveEconomy_(account(), learning('e_one')), /이용 권한/);
permissions = {hanmun: true};
assert.throws(() => context.saveExam('valid-session', {}), /형식 오류/);

// Internal login requires an allowed app before device/session state is created.
context.CacheService = {getScriptCache: () => ({get: () => null, remove: () => {}})};
context.account_ = () => ({...account(), pin: '1234'});
for (const app of [undefined, '', 'unknown']) {
  assert.throws(() => context.login_('student-a', '1234', false,
    'device-12345678901234567890', 'PC · Windows · 1920×1080', null, app), /앱 설정/);
}
assert.throws(() => context.login_('student-a', '1234', false,
  'device-12345678901234567890', 'PC · Windows · 1920×1080', null, 'economy'), /이용 권한/);

// Login wrappers pass the app to the private login without returning account/PIN internals.
context.login_ = (...args) => {
  assert.equal(args[6], 'classic');
  assert.equal(args[5], null);
  return {payload: {id: 'student-a', data: []}, token: 'new-session',
    permissions: {classic: true}, a: {...account(), pin: 'hidden'}, s: {}, layout: {}};
};
context.mariFirstLogin_ = () => {};
const signedIn = context.mariSignIn('student-a', '1234', false, 'device', 'label', 'classic');
assert.equal(signedIn.token, 'new-session');
assert.equal(signedIn.a, undefined);
assert.equal(signedIn.pin, undefined);
assert.equal(signedIn.s, undefined);
console.log('PASS private setup/login functions, legacy and current app permissions, expired sessions, immediate revocation, allowed saves, single locks and login payload');
