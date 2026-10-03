import app from './api/index.js';

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => console.log(`QuickCart API listening on ${port}`));
