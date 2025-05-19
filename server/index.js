const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
require('dotenv').config();
app.use(cors());

app.get('/download', async (req, res) => {
  const fileUrl = req.query.url;
  try {
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream'
    });

    res.setHeader('Content-Type', response.headers['content-type']);
    response.data.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).send('Error downloading file');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
