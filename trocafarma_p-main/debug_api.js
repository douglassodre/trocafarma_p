
import axios from 'axios';

async function testApi() {
    try {
        const query = 'Dipirona';
        console.log(`Searching for: ${query}`);
        // Try alternate URL
        const url = `https://bula.vercel.app/pesquisar?nome=${query}`;
        console.log(`Requesting ${url}...`);
        const response = await axios.get(url);
        console.log('Status:', response.status);

        // Adjust logging to avoid circular structures if printing the whole object
        console.log('Full Response Data:', JSON.stringify(response.data, null, 2));

        if (response.data && response.data.content) {
            console.log('Content Length:', response.data.content.length);
            if (response.data.content.length > 0) {
                console.log('First Item:', response.data.content[0]);
            }
        } else {
            console.log('WARNING: "content" field missing!');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testApi();
