# Task Definition
## Fill file app.mjs for avg-sensor-data
### Compute average values for sensors
1. Consider object with fields-sensors data<br>
1.1 Key - sensorId, value - array of comming values
2. Once amount of values for a sensorId equals env variable REDUCING_SIZE, compute average value for the sensorId and publish (sensorId, avg-value, current timestamp) to topic with arn as value of appropriate env variable
## Fill file app.mjs for avg-data-processor
1. for each comming message print (console.log) the following:<br>
- sensorId <br>
- avg value <br> 
- time in any format of date/time converted from timestamp with time zone from env variable TZ