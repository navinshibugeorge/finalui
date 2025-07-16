const AWS = require("aws-sdk")

const dynamodb = new AWS.DynamoDB.DocumentClient()
const TABLE_NAME = process.env.USERS_TABLE

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  }

  try {
    const { httpMethod, pathParameters, body } = event

    switch (httpMethod) {
      case "OPTIONS":
        return { statusCode: 200, headers }

      case "GET":
        return await getUserProfile(pathParameters.id, headers)

      case "PUT":
        return await updateUserProfile(pathParameters.id, JSON.parse(body), headers)

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

async function getUserProfile(userId, headers) {
  const result = await dynamodb
    .get({
      TableName: TABLE_NAME,
      Key: { user_id: userId },
    })
    .promise()

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "User not found" }),
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Item),
  }
}

async function updateUserProfile(userId, profileData, headers) {
  const timestamp = new Date().toISOString()

  const updateExpression = []
  const expressionAttributeValues = {
    ":updated_at": timestamp,
  }
  const expressionAttributeNames = {}

  Object.keys(profileData).forEach((key) => {
    if (key !== "user_id") {
      updateExpression.push(`#${key} = :${key}`)
      expressionAttributeNames[`#${key}`] = key
      expressionAttributeValues[`:${key}`] = profileData[key]
    }
  })

  updateExpression.push("#updated_at = :updated_at")
  expressionAttributeNames["#updated_at"] = "updated_at"

  await dynamodb
    .update({
      TableName: TABLE_NAME,
      Key: { user_id: userId },
      UpdateExpression: `SET ${updateExpression.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
    .promise()

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: "User profile updated successfully" }),
  }
}
