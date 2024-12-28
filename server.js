const express = require('express');
const { google } = require('googleapis');
const uuid = require('uuid');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 8881;

// Google Sheets setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = '1C9cpVcNtGV-iTFjPW-bicysODYVI3AHjeM42RdQJb4w'; // Replace with your actual Google Sheets ID
const SERVICE_ACCOUNT_FILE = path.join(__dirname, 'path_to_your_credentials.json');

// Load name mappings from JSON file
const NAME_GROUP_MAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'name_mapping.json'), 'utf8'));

let userLinks = {};

// Middleware to parse incoming form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('views', path.join(__dirname, 'views')); // Set views directory
app.set('view engine', 'ejs'); // Set view engine to EJS

// Function to authenticate Google Sheets API
function getGoogleSheetsService() {
    const auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_FILE,
        scopes: SCOPES,
    });
    return google.sheets({ version: 'v4', auth });
}

// Route for home page
app.get('/', (req, res) => {
    if (Object.keys(userLinks).length === 0) {
        for (const name of Object.keys(NAME_GROUP_MAP)) {
            const uniqueLink = uuid.v4(); // Generate unique link using uuid
            userLinks[name] = uniqueLink;
        }
    }
    res.render('index', { data: userLinks });
});

// Route for submitting data
app.post('/submit/:user_id', async (req, res) => {
    const userId = req.params.user_id;
    const { name, no_response_list, rejection_list, ...numericFields } = req.body;

    if (!Object.values(userLinks).includes(userId)) {
        return res.status(400).send('Invalid Link!');
    }

    // Convert numeric fields to numbers and handle invalid data
    const numericValues = Object.values(numericFields).map(value => {
        const num = Number(value);
        if (isNaN(num)) {
            throw new Error(`Invalid data! All fields must be valid numbers. Invalid value: ${value}`);
        }
        return num;
    });

    const [
        input1, input2, input3, input4, input5, input6, input7, input8, input9, input10, input11,
        input12, input13, input14, input15, input16, input17, input18, input19, input20, input21
    ] = numericValues;

    const sheets = getGoogleSheetsService();
    const values = [name, input1, input2, input3, input4, input5, input6, input7, input8, input9, input10,
                    input11, input12, input13, input14, input15, input16, input17, input18, input19, input20, input21];

    if (NAME_GROUP_MAP[name]) {
        const rowNumber = NAME_GROUP_MAP[name];
        const range = `Sheet1!A${rowNumber}:U${rowNumber}`;  // Ensure range matches your sheet
        const resource = { values: [values] };

        try {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range,
                valueInputOption: 'USER_ENTERED',
                resource,
            });
            res.render('success');
        } catch (error) {
            console.error('Error updating Google Sheets:', error);
            res.status(500).send('Error updating Google Sheets: ' + error.message);
        }
    } else {
        res.status(400).send('Name not found in mapping!');
    }
});

// Route for unique user link
app.get('/link/:name', (req, res) => {
    const { name } = req.params;
    if (userLinks[name]) {
        res.render('link_page', { link: userLinks[name], name });
    } else {
        res.status(404).send('User not found!');
    }
});

// Route for success page
app.get('/success', (req, res) => {
    res.render('success');
});

// Start the server
app.listen(port, () => {
    console.log('Server running at http://localhost:' + port);
});
