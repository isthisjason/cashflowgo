const OFFLINE_DB_KEY = 'cfg_offline_db_v1';

const today = () => new Date().toISOString().split('T')[0];

const createInitialOfflineDb = () => ({
  users: [
    {
      id: 1,
      email: 'admin@local.dev',
      username: 'admin',
      password: 'password',
      is_active: true,
    },
  ],
  adjustedIncome: {
    personal: 5000,
    business: 12000,
    family: 7000,
  },
  transactions: [
    { id: 1, user: 1, profile_type: 'personal', amount: '75.50', category: 'Groceries', date: today(), transaction_type: 'Expense' },
    { id: 2, user: 1, profile_type: 'personal', amount: '120.00', category: 'Gas', date: today(), transaction_type: 'Expense' },
    { id: 3, user: 1, profile_type: 'business', amount: '350.00', category: 'Software', date: today(), transaction_type: 'Expense' },
    { id: 4, user: 1, profile_type: 'family', amount: '65.00', category: 'School', date: today(), transaction_type: 'Expense' },
  ],
  budgets: {
    personal: { monthly_limit: 1500 },
    business: { monthly_limit: 4000 },
    family: { monthly_limit: 2200 },
  },
  subscriptions: [
    {
      id: 1,
      name: 'Netflix',
      amount: '15.99',
      start_date: today(),
      expiry_date: today(),
      reminder_days: 7,
      email: 'admin@local.dev',
      profile_type: 'personal',
      user: 1,
    },
  ],
});

const loadOfflineDb = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to parse offline DB, recreating.', error);
  }
  const initial = createInitialOfflineDb();
  localStorage.setItem(OFFLINE_DB_KEY, JSON.stringify(initial));
  return initial;
};

const saveOfflineDb = (db) => {
  localStorage.setItem(OFFLINE_DB_KEY, JSON.stringify(db));
};

const toPath = (url = '', baseURL = '') => {
  try {
    const parsed = new URL(url, baseURL);
    return parsed.pathname;
  } catch {
    return url;
  }
};

const responseFrom = (config, data, status = 200, statusText = 'OK') => ({
  data,
  status,
  statusText,
  headers: {},
  config,
});

const getProfileType = (config, fallback = 'personal') => {
  const fromParams = config?.params?.profile_type;
  const fromData = config?.data?.profile_type;
  if (typeof fromParams === 'string' && fromParams) return fromParams.toLowerCase();
  if (typeof fromData === 'string' && fromData) return fromData.toLowerCase();
  return fallback;
};

const currentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('loggedInUser') || 'null');
  } catch {
    return null;
  }
};

const currentUserId = () => currentUser()?.id || 1;

const calculateCurrentSpending = (db, profile) =>
  db.transactions
    .filter((txn) => txn.profile_type === profile && txn.transaction_type === 'Expense' && txn.user === currentUserId())
    .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);

const normalizeRequestData = (config) => {
  if (!config?.data) return {};
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data);
    } catch {
      return {};
    }
  }
  return config.data;
};

export const tryOfflineMock = (config, baseURL) => {
  const method = (config.method || 'get').toLowerCase();
  const path = toPath(config.url, baseURL);
  const db = loadOfflineDb();
  const data = normalizeRequestData(config);

  if (method === 'get' && path.endsWith('/accounts/csrf/')) {
    return responseFrom(config, { message: 'CSRF token set successfully (offline mode).' });
  }

  if (method === 'post' && path.endsWith('/accounts/login/')) {
    const email = (data.email || '').toLowerCase();
    const password = data.password || '';
    const user = db.users.find((u) => u.email.toLowerCase() === email && u.password === password);
    if (!user) {
      return responseFrom(config, { error: 'Invalid credentials (offline mode).' }, 401, 'Unauthorized');
    }
    return responseFrom(config, {
      message: 'Login successful (offline mode)',
      csrf_token: 'offline-csrf-token',
      is_authenticated: true,
      user: { id: user.id, email: user.email },
    });
  }

  if (method === 'post' && path.endsWith('/accounts/signup/')) {
    const email = (data.email || '').toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return responseFrom(config, { error: 'A user with this email already exists.' }, 400, 'Bad Request');
    }
    const id = Math.max(0, ...db.users.map((u) => u.id)) + 1;
    db.users.push({
      id,
      email,
      username: data.username || `user${id}`,
      password: data.password || 'password',
      is_active: true,
    });
    saveOfflineDb(db);
    return responseFrom(config, { message: 'User created successfully (offline mode).' }, 201, 'Created');
  }

  if (method === 'post' && path.endsWith('/accounts/logout/')) {
    return responseFrom(config, {
      message: 'Logged out successfully (offline mode).',
      csrf_token: 'offline-csrf-token',
      is_authenticated: false,
    });
  }

  if (method === 'get' && path.match(/\/finances\/transactions\/[^/]+\/$/)) {
    const profile = path.split('/').filter(Boolean).slice(-1)[0].toLowerCase();
    const rows = db.transactions
      .filter((txn) => txn.profile_type === profile && txn.user === currentUserId())
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
    return responseFrom(config, rows);
  }

  if (method === 'post' && path.endsWith('/finances/add-transaction/')) {
    const profileType = (data.profile_type || data.profile || 'personal').toLowerCase();
    const id = Math.max(0, ...db.transactions.map((t) => t.id)) + 1;
    const txn = {
      id,
      user: currentUserId(),
      profile_type: profileType,
      amount: String(data.amount || '0'),
      category: data.category || 'Uncategorized',
      date: data.date || today(),
      transaction_type: data.transaction_type || 'Expense',
    };
    db.transactions.push(txn);
    saveOfflineDb(db);
    return responseFrom(config, txn, 201, 'Created');
  }

  if (path.match(/\/finances\/adjusted-income\/[^/]+\/$/)) {
    const profile = path.split('/').filter(Boolean).slice(-1)[0].toLowerCase();
    const key = `adjusted_income_${profile}`;
    if (method === 'get') {
      return responseFrom(config, { [key]: db.adjustedIncome[profile] ?? 0 });
    }
    if (method === 'patch') {
      db.adjustedIncome[profile] = Number(data.adjusted_income || 0);
      saveOfflineDb(db);
      return responseFrom(config, { message: 'Income updated successfully (offline mode).', [key]: db.adjustedIncome[profile] });
    }
  }

  if (path.endsWith('/finances/budget/')) {
    const profile = getProfileType(config);
    if (!db.budgets[profile]) db.budgets[profile] = { monthly_limit: 0 };
    if (method === 'get') {
      return responseFrom(config, {
        id: 1,
        email: currentUser()?.email || 'admin@local.dev',
        profile_type: profile,
        monthly_limit: db.budgets[profile].monthly_limit,
        current_spending: calculateCurrentSpending(db, profile),
      });
    }
    if (method === 'post') {
      db.budgets[profile].monthly_limit = Number(data.monthly_limit || 0);
      saveOfflineDb(db);
      return responseFrom(config, {
        id: 1,
        email: currentUser()?.email || 'admin@local.dev',
        profile_type: profile,
        monthly_limit: db.budgets[profile].monthly_limit,
      });
    }
  }

  if (method === 'get' && path.endsWith('/finances/subscriptions/')) {
    const profile = getProfileType(config);
    const rows = db.subscriptions.filter((s) => s.user === currentUserId() && s.profile_type === profile);
    return responseFrom(config, rows);
  }

  if (method === 'post' && path.endsWith('/finances/subscriptions/')) {
    const id = Math.max(0, ...db.subscriptions.map((s) => s.id)) + 1;
    const sub = {
      id,
      user: currentUserId(),
      name: data.name,
      amount: String(data.amount),
      start_date: data.start_date,
      expiry_date: data.expiry_date,
      reminder_days: Number(data.reminder_days || 7),
      email: data.email,
      profile_type: (data.profile_type || 'personal').toLowerCase(),
    };
    db.subscriptions.push(sub);
    saveOfflineDb(db);
    return responseFrom(config, sub, 201, 'Created');
  }

  if (method === 'delete' && path.match(/\/finances\/subscriptions\/\d+\/$/)) {
    const id = Number(path.split('/').filter(Boolean).slice(-1)[0]);
    db.subscriptions = db.subscriptions.filter((s) => s.id !== id);
    saveOfflineDb(db);
    return responseFrom(config, {}, 204, 'No Content');
  }

  return null;
};
