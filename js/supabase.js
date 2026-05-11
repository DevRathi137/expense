/* ── SUPABASE CLIENT ────────────────────────────────────────── */
const _SB_URL = 'https://ilffkmzykehiavqoppji.supabase.co';
const _SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZmZrbXp5a2VoaWF2cW9wcGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc3MzEsImV4cCI6MjA5MzcyMzczMX0.egSXaPXiDZ4F5YQ13_rIHtUN6JmXo-O56vD5Pqc0hl0';

const sbClient = window.supabase.createClient(_SB_URL, _SB_KEY);

/* ── AUTH ───────────────────────────────────────────────────── */
async function sbGetSession() {
  const { data: { session } } = await sbClient.auth.getSession();
  return session;
}
async function sbGetUser() {
  const { data: { session } } = await sbClient.auth.getSession();
  return session?.user ?? null;
}
async function sbSignIn(email, password) {
  const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
async function sbSignUp(email, password) {
  const { data, error } = await sbClient.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}
async function sbSignOut() {
  const { error } = await sbClient.auth.signOut();
  if (error) throw error;
}

/* ── LOAD ALL STATE FROM SUPABASE ───────────────────────────── */
async function sbLoadState() {
  const { data: { session } } = await sbClient.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('not authenticated');
  const uid = user.id;

  const [
    { data: settings },
    { data: peopleRows },
    { data: expenseRows },
    { data: entryRows },
    { data: splitRows },
    { data: wishRows },
    { data: settlementRows }
  ] = await Promise.all([
    sbClient.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
    sbClient.from('people').select('*').eq('user_id', uid),
    sbClient.from('expenses').select('*').eq('user_id', uid),
    sbClient.from('expense_entries').select('*').eq('user_id', uid),
    sbClient.from('splits').select('*').eq('user_id', uid),
    sbClient.from('wishlist').select('*').eq('user_id', uid),
    sbClient.from('settlements').select('*').eq('user_id', uid)
  ]);

  // build expenses map: month → [expense groups with entries]
  const expenses = {};
  (expenseRows || []).forEach(exp => {
    if (!expenses[exp.month]) expenses[exp.month] = [];
    expenses[exp.month].push({
      id: exp.id,
      name: exp.name,
      cat: exp.category,
      fromWish: exp.from_wish || undefined,
      entries: []
    });
  });
  // attach entries to their parent expense group
  (entryRows || []).forEach(en => {
    for (const arr of Object.values(expenses)) {
      const exp = arr.find(e => e.id === en.expense_id);
      if (exp) {
        exp.entries.push({
          id: en.id,
          date: en.date,
          amount: parseFloat(en.amount),
          note: en.note || '',
          paidBy: en.paid_by || ''
        });
        break;
      }
    }
  });

  // build splits map: month → expenseId → personId → amount
  const splits = {};
  (splitRows || []).forEach(sp => {
    if (!splits[sp.month]) splits[sp.month] = {};
    if (!splits[sp.month][sp.expense_id]) splits[sp.month][sp.expense_id] = {};
    splits[sp.month][sp.expense_id][sp.person_id] = parseFloat(sp.amount);
  });

  const settlements = {};
  (settlementRows || []).forEach(s => { settlements[s.month] = s.data; });

  return {
    expenses,
    people:   (peopleRows || []).map(p => ({ id: p.id, name: p.name })),
    splits,
    wishlist: (wishRows || []).map(w => ({
      id: w.id, name: w.name, cost: parseFloat(w.cost),
      cat: w.category, type: w.type, done: w.done
    })),
    settlements,
    budget: settings?.budget ?? 30000
  };
}

/* ── EXPENSE CRUD ───────────────────────────────────────────── */
async function sbSaveExpense(month, expense) {
  const user = await sbGetUser();
  if (!user) throw new Error('sbSaveExpense: not authenticated');
  const uid = user.id;

  const { error: expErr } = await sbClient.from('expenses').upsert({
    id: expense.id, user_id: uid,
    name: expense.name, category: expense.cat || 'Other',
    month, from_wish: expense.fromWish || null
  }, { onConflict: 'id' });
  if (expErr) throw expErr;

  if (expense.entries?.length) {
    const { error: enErr } = await sbClient.from('expense_entries').upsert(
      expense.entries.map(en => ({
        id: en.id, expense_id: expense.id, user_id: uid,
        date: en.date, amount: en.amount,
        note: en.note || '', paid_by: en.paidBy || null
      })),
      { onConflict: 'id' }
    );
    if (enErr) throw enErr;
  }
}

async function sbDeleteExpense(expenseId) {
  const { error } = await sbClient.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}

async function sbSaveEntry(expenseId, entry) {
  const user = await sbGetUser();
  if (!user) throw new Error('sbSaveEntry: not authenticated');
  const { error } = await sbClient.from('expense_entries').upsert({
    id: entry.id, expense_id: expenseId, user_id: user.id,
    date: entry.date, amount: entry.amount,
    note: entry.note || '', paid_by: entry.paidBy || null
  }, { onConflict: 'id' });
  if (error) throw error;
}

async function sbDeleteEntry(entryId) {
  const { error } = await sbClient.from('expense_entries').delete().eq('id', entryId);
  if (error) throw error;
}

/* ── PEOPLE CRUD ────────────────────────────────────────────── */
async function sbSavePeople(people) {
  const user = await sbGetUser();
  if (!user) throw new Error('sbSavePeople: not authenticated');
  if (!people.length) return;
  const { error } = await sbClient.from('people').upsert(
    people.map(p => ({ id: p.id, user_id: user.id, name: p.name })),
    { onConflict: 'id' }
  );
  if (error) throw error;
}

async function sbDeletePerson(personId) {
  const { error } = await sbClient.from('people').delete().eq('id', personId);
  if (error) throw error;
}

/* ── SPLITS ─────────────────────────────────────────────────── */
async function sbSaveSplits(month, monthSplits) {
  const user = await sbGetUser();
  if (!user) throw new Error('sbSaveSplits: not authenticated');
  const uid = user.id;

  await sbClient.from('splits').delete().eq('user_id', uid).eq('month', month);

  const rows = [];
  Object.entries(monthSplits).forEach(([expId, persons]) => {
    Object.entries(persons).forEach(([personId, amount]) => {
      rows.push({ expense_id: expId, person_id: personId, user_id: uid, amount, month });
    });
  });
  if (rows.length) {
    const { error } = await sbClient.from('splits').insert(rows);
    if (error) throw error;
  }
}

/* ── WISHLIST ───────────────────────────────────────────────── */
async function sbSaveWishlist(wishlist) {
  const user = await sbGetUser();
  if (!user) throw new Error('sbSaveWishlist: not authenticated');
  const uid = user.id;

  const { data: existing } = await sbClient.from('wishlist').select('id').eq('user_id', uid);
  const toDelete = (existing || []).map(r => r.id).filter(id => !wishlist.find(w => w.id === id));
  if (toDelete.length) await sbClient.from('wishlist').delete().in('id', toDelete);

  if (wishlist.length) {
    const { error } = await sbClient.from('wishlist').upsert(
      wishlist.map(w => ({
        id: w.id, user_id: uid, name: w.name,
        cost: w.cost || 0, category: w.cat || 'Other',
        type: w.type || 'want', done: w.done || false
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }
}

/* ── SETTINGS ───────────────────────────────────────────────── */
async function sbSaveSettings(budget) {
  const user = await sbGetUser();
  if (!user) throw new Error('sbSaveSettings: not authenticated');
  const { error } = await sbClient.from('user_settings').upsert(
    { user_id: user.id, budget },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

/* ── SETTLEMENTS ────────────────────────────────────────────── */
async function sbSaveSettlements(month, data) {
  const user = await sbGetUser();
  if (!user) throw new Error('sbSaveSettlements: not authenticated');
  const { error } = await sbClient.from('settlements').upsert(
    { user_id: user.id, month, data },
    { onConflict: 'user_id,month' }
  );
  if (error) throw error;
}

/* ── ONE-TIME MIGRATION FROM LOCALSTORAGE ───────────────────── */
async function sbMigrateFromLocalStorage(localState) {
  await sbSaveSettings(localState.budget || 30000);

  if (localState.people?.length) await sbSavePeople(localState.people);
  if (localState.wishlist?.length) await sbSaveWishlist(localState.wishlist);

  for (const [month, exps] of Object.entries(localState.expenses || {})) {
    for (const expense of exps) {
      await sbSaveExpense(month, expense);
    }
    if (localState.splits?.[month]) {
      await sbSaveSplits(month, localState.splits[month]);
    }
  }

  localStorage.setItem('sb_migrated', '1');
}
