const AWS = require("aws-sdk")
const { v4: uuidv4 } = require("uuid")

const dynamodb = new AWS.DynamoDB.DocumentClient()
const TABLE_NAME = process.env.PICKUP_REQUESTS_TABLE

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  }

  try {
    const { httpMethod, pathParameters, queryStringParameters, body } = event

    switch (httpMethod) {
      case "OPTIONS":
        return { statusCode: 200, headers }

      case "GET":
        return await getPickupRequests(queryStringParameters, headers)

      case "POST":
        return await createPickupRequest(JSON.parse(body), headers)

      case "PUT":
        return await updatePickupRequest(pathParameters.id, JSON.parse(body), headers)

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: "Method not allowed" }),
        }
    }
  } catch (error) {
    console.error("Error:", error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    }
  }
}

async function getPickupRequests(queryParams, headers) {
  const { userId, userType, status } = queryParams || {}

  const params = {
    TableName: TABLE_NAME,
  }

  if (userId) {
    params.IndexName = "user-index"
    params.KeyConditionExpression = "user_id = :userId"
    params.ExpressionAttributeValues = {
      ":userId": userId,
    }
  } else if (status) {
    params.IndexName = "status-index"
    params.KeyConditionExpression = "#status = :status"
    params.ExpressionAttributeNames = {
      "#status": "status",
    }
    params.ExpressionAttributeValues = {
      ":status": status,
    }
  }

  const result = await dynamodb.query(params).promise()

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Items),
  }
}

async function createPickupRequest(requestData, headers) {
  const requestId = uuidv4()
  const timestamp = new Date().toISOString()

  const item = {
    request_id: requestId,
    user_id: requestData.citizen_id || requestData.factory_id,
    user_type: requestData.user_type,
    citizen_id: requestData.citizen_id,
    citizen_name: requestData.citizen_name,
    citizen_contact: requestData.citizen_contact,
    citizen_address: requestData.citizen_address,
    factory_id: requestData.factory_id,
    factory_name: requestData.factory_name,
    factory_contact: requestData.factory_contact,
    factory_address: requestData.factory_address,
    waste_type: requestData.waste_type,
    estimated_quantity: requestData.estimated_quantity,
    description: requestData.description,
    preferred_date: requestData.preferred_date,
    preferred_time: requestData.preferred_time,
    status: "pending",
    created_at: timestamp,
    updated_at: timestamp,
  }

  await dynamodb
    .put({
      TableName: TABLE_NAME,
      Item: item,
    })
    .promise()

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ request_id: requestId, message: "Pickup request created successfully" }),
  }
}

async function updatePickupRequest(requestId, updateData, headers) {
  const timestamp = new Date().toISOString()

  const updateExpression = []
  const expressionAttributeValues = {
    ":updated_at": timestamp,
  }
  const expressionAttributeNames = {}

  Object.keys(updateData).forEach((key) => {
    if (key !== "request_id") {
      updateExpression.push(`#${key} = :${key}`)
      expressionAttributeNames[`#${key}`] = key
      expressionAttributeValues[`:${key}`] = updateData[key]
    }
  })

  updateExpression.push("#updated_at = :updated_at")
  expressionAttributeNames["#updated_at"] = "updated_at"

  await dynamodb
    .update({
      TableName: TABLE_NAME,
      Key: { request_id: requestId },
      UpdateExpression: `SET ${updateExpression.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
    .promise()

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: "Pickup request updated successfully" }),
  }
}
