# Task Definition
## Update code for avg-sensor-data lambda function
### Instead of object sensorsHistory (stateful function) introduce DynamoDB (stateless function)
consider table with PK as "sensorId", no SK, sum-value, count<br>
consider DynamoDB client commands GetCommand, PutCommand, UpdateCommand, DeleteCommand
## Update template file 
add resource for creating Dynamodb table intended for finding average values
add permissions for Dynamodb full access (write & read) in the role of avg-sensor-data lambda