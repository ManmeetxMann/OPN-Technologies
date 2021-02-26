module.exports = {
  'env': {
    'commonjs': true,
  },
  'extends': [
    'google',
  ],
  'plugins': [],
  'parserOptions': {
    'ecmaVersion': 12,
    "sourceType": "script",
    "project":[]
  },
  'rules': {
    'max-len': ["error", { "code": 120 }]
  },
};
