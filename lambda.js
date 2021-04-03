
const https = require('https');
var aws = require("aws-sdk");
var ses = new aws.SES({ region: "us-east-1" });

const apiKey = process.env.apiKey;
const siteId = process.env.siteId
const destinationEmails = JSON.parse(process.env.destinationEmails);
const sourceEmail = process.env.sourceEmail;

const rootUrl = 'https://monitoringapi.solaredge.com';
const dayMs = 86400000;
const yearMs = dayMs * 365;

const htmlTemplate = `<html>
<head>
<style>
table, th, td {
  border: 1px solid black;
  border-collapse: collapse;
  width: calc(100vw/2);
}

th, td {
  padding: 5px;
}
</style>
</head>
<body>{body}</body></html>`;

const getDate = (dateOffset) => {
        
    if (!dateOffset) dateOffset = 0;
    
    const ms = new Date().getTime();
    const dateToUse = new Date(ms + dateOffset);
    
    const month = dateToUse.getMonth() + 1;
    const day = dateToUse.getDate();
    const year = dateToUse.getFullYear();
    
    
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

const getEnergy = async (timeUnit, startDate, endDate) => {
    
    const path = `/site/${siteId}/energy`;
    const search = `?timeUnit=${timeUnit}&startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`;
    
    const url = `${rootUrl}${path}${search}`;
    
    return new Promise((resolve, reject) => {
        console.log(url);
        https.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                resolve(data);
            });
            
            response.on('error', (error) => {
                console.log(error);
                reject(error);
            });
        });
    });
};


exports.handler = async (event) => {
    try {
        let startDate = getDate(-1 * yearMs);
        const endDate = getDate();
        
        const monthlyEnergy = JSON.parse(await getEnergy('MONTH', startDate, endDate));
        
        const monthlyEnergyRows = [];
        for (const monthEnergy of monthlyEnergy?.energy?.values) {
            const value = monthEnergy?.value ?? 0;
            const row = `<tr><td>${monthEnergy?.date?.split(' ')?.[0] ?? ""}</td><td>${value}</td><td>${Math.round(value/30)}</td></tr>`
            monthlyEnergyRows.push(row);
        }
        
        const monthlyEnergyTable = `<table><caption>Monthly Summary</caption><tr><th>Date</th><th>Total Energy</th><th>Average Daily Energy</th></tr>${monthlyEnergyRows.join('')}</table>`
        
        startDate = getDate(-1 * dayMs);
        const jsonResponse = await getEnergy('DAY', startDate, endDate)
        const todayEnergy = JSON.parse(jsonResponse);
        
        const todaysEnergyHeader = `<h2>Today's Energy Generation - ${todayEnergy?.energy?.values?.[1]?.value ?? 0}</h2>`
        
        const params = {
            Destination: {
              ToAddresses: destinationEmails,
            },
            Message: {
                Body: {
                  Html: {
                     Charset: "UTF-8", 
                     Data: htmlTemplate.replace('{body}', `${todaysEnergyHeader}<br/><br/>${monthlyEnergyTable}`)
                    }, 
                },
        
              Subject: { Data: "SolarEdge Summary" },
            },
            Source: sourceEmail,
          };
         
      return ses.sendEmail(params).promise();
        
    } catch (exception) {
        return {
            statusCode: 500,
            body: JSON.stringify(exception)
        };
    }
};
