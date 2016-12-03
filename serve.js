const express = require('express');

const app = express();

app.use('/', express.static('build'));

app.listen(8070, () => {
	console.log("Application serving in port 8070.");
});
