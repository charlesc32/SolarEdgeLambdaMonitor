# SolarEdgeLambdaMonitor
A lambda function that will use the solar edge api to report current day and past year energy generation.

For some reason the solar edge inverter has a really nice and even an exposed API but there is no function to alert when the inverter stops recording energy generation. The lambda function will use the solaredge apis to query the current day's energy and the past year's energy (by month) and email the results.

I use the cloudwatch event trigger to run it once per day.
