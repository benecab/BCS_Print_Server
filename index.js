const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

const app = express();

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/', (req, res) => {
	try {
		//CHECK TO SEE IF WE HAVE THE STUFF
		const { fileUrl, printer, parts } = req.body;
		if (!fileUrl || !printer || !parts)
			return res.status(400).json({ err: 'Missing fileUrl or printer' });

		const file = fs.createWriteStream(`./tmp/${uuidv4()}.pdf`);

		axios.post(fileUrl, { parts }, { responseType: 'stream' }).then((response) => {
			response.data.pipe(file);
			file.on('finish', () => {
				file.close();

				const filePath = path.resolve(file.path);

				//TODO: PRINT THE FILE
				exec(`lp ${filePath} -d ${printer}`, (error, stdout, stderr) => {
					//DELETE THE FILE
					fs.unlinkSync(filePath);

					if (error) {
						return res.status(400).json({ status: 'invalid printer or document', error });
					}

					return res.status(201).json({ status: `file printing - ${stdout}` });
				});
			});
		});
	} catch (error) {
		console.log(error);
		return res.status(400).json(error);
	}
});

app.listen(4000, (err) => {
	console.log('Print Server Online - Port:4000');
});
