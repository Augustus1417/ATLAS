# ATLAS Backend API Manual

This document is for the frontend developer. Every endpoint returns the same envelope:

```json
{
  "data": {},
  "message": "Success message"
}
```

For errors, the backend returns the same envelope with `data: null` or validation details and a message.

## Base Notes

- Base URL: your FastAPI server root
- Swagger UI: `/docs`
- Authentication: JWT Bearer token in the `Authorization` header
- Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

- Dates are returned from the database in UTC
- Creation endpoints usually return `201`
- Validation errors return `422`
- Unauthenticated requests return `401`
- Missing resources return `404`
- External recommendation failures return `502`

## Auth Flow

1. Register a user.
2. Log in to receive `access_token`.
3. Send the token in `Authorization: Bearer ...` for protected routes.

---

## Users

### `POST /users/register`
Register a new user account.

Request body:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

Response `201`:
```json
{
  "data": {
    "user_id": 1,
    "role_id": 2,
    "username": "john_doe",
    "email": "john@example.com",
    "is_active": true,
    "created_at": "2026-04-25T10:00:00Z"
  },
  "message": "User registered successfully"
}
```

Validation notes:
- `username`: 3 to 50 chars
- `email`: valid email format
- `password`: minimum 8 chars

### `POST /users/login`
Authenticate a user and return a bearer token.

Request body:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response `200`:
```json
{
  "data": {
    "token": {
      "access_token": "<jwt>",
      "token_type": "bearer"
    },
    "user": {
      "user_id": 1,
      "role_id": 2,
      "username": "john_doe",
      "email": "john@example.com",
      "is_active": true,
      "created_at": "2026-04-25T10:00:00Z"
    }
  },
  "message": "Login successful"
}
```

### `GET /users/me`
Return the authenticated user profile.

Headers:
```http
Authorization: Bearer <access_token>
```

Response `200`:
```json
{
  "data": {
    "user_id": 1,
    "role_id": 2,
    "username": "john_doe",
    "email": "john@example.com",
    "is_active": true,
    "role_name": "user"
  },
  "message": "Current user fetched successfully"
}
```

---

## Components

### `GET /components`
List components with optional filters.

Query params:
- `category` optional string
- `brand` optional string
- `is_active` optional boolean

Example:
`/components?category=CPU&brand=AMD&is_active=true`

Response `200`:
```json
{
  "data": [
    {
      "component_id": 1,
      "name": "AMD Ryzen 5 5600",
      "brand": "AMD",
      "category": "CPU",
      "form_factor": null,
      "release_year": 2022,
      "is_active": true,
      "added_by": 1,
      "created_at": "2026-04-25T10:00:00Z",
      "updated_at": "2026-04-25T10:00:00Z"
    }
  ],
  "message": "Components fetched successfully"
}
```

### `GET /components/{component_id}`
Return component detail, specs, and latest price.

Response `200`:
```json
{
  "data": {
    "component": {
      "component_id": 1,
      "name": "AMD Ryzen 5 5600",
      "brand": "AMD",
      "category": "CPU"
    },
    "specs": [
      {
        "spec_id": 1,
        "component_id": 1,
        "spec_name": "Cores",
        "spec_value": "6",
        "unit": null
      }
    ],
    "latest_price": {
      "price_id": 1,
      "component_id": 1,
      "price": 6650,
      "currency": "PHP",
      "source": "{\"s\":\"Datablitz\"}",
      "recorded_at": "2026-04-25T10:00:00Z"
    }
  },
  "message": "Component detail fetched successfully"
}
```

### `POST /components`
Create a component. Admin only.

Headers:
```http
Authorization: Bearer <admin_token>
```

Request body:
```json
{
  "name": "AMD Ryzen 5 5600",
  "brand": "AMD",
  "category": "CPU",
  "form_factor": null,
  "release_year": 2022
}
```

Response `201`:
```json
{
  "data": {
    "component_id": 1,
    "name": "AMD Ryzen 5 5600",
    "brand": "AMD",
    "category": "CPU"
  },
  "message": "Component created successfully"
}
```

### `PUT /components/{component_id}`
Update a component.

Headers:
```http
Authorization: Bearer <access_token>
```

Request body examples:
```json
{
  "brand": "AMD",
  "release_year": 2023
}
```

Response `200`:
```json
{
  "data": { },
  "message": "Component updated successfully"
}
```

### `DELETE /components/{component_id}`
Soft delete a component by setting `is_active = false`.

Headers:
```http
Authorization: Bearer <access_token>
```

Response `200`:
```json
{
  "data": { },
  "message": "Component soft deleted successfully"
}
```

---

## Specs

### `GET /components/{component_id}/specs`
Return all specs for a component.

Response `200`:
```json
{
  "data": [
    {
      "spec_id": 1,
      "component_id": 1,
      "spec_name": "Cores",
      "spec_value": "6",
      "unit": null
    }
  ],
  "message": "Component specs fetched successfully"
}
```

### `POST /components/{component_id}/specs`
Add one or more spec entries.

Headers:
```http
Authorization: Bearer <access_token>
```

Request body:
```json
{
  "specs": [
    {
      "spec_name": "Cores",
      "spec_value": "6",
      "unit": null
    },
    {
      "spec_name": "Threads",
      "spec_value": "12",
      "unit": null
    }
  ]
}
```

Response `201`:
```json
{
  "data": [
    {
      "spec_id": 1,
      "component_id": 1,
      "spec_name": "Cores",
      "spec_value": "6",
      "unit": null
    }
  ],
  "message": "Component specs created successfully"
}
```

---

## Pricing

### `GET /components/{component_id}/pricing`
Return full pricing history for a component.

Response `200`:
```json
{
  "data": [
    {
      "price_id": 1,
      "component_id": 1,
      "price": 6650,
      "currency": "PHP",
      "source": "{\"s\":\"Datablitz\"}",
      "recorded_at": "2026-04-25T10:00:00Z"
    }
  ],
  "message": "Pricing history fetched successfully"
}
```

### `POST /components/{component_id}/pricing`
Insert a manual pricing record.

Headers:
```http
Authorization: Bearer <access_token>
```

Request body:
```json
{
  "price": 6650,
  "currency": "PHP",
  "source": "manual"
}
```

Response `201`:
```json
{
  "data": {
    "price_id": 1,
    "component_id": 1,
    "price": 6650,
    "currency": "PHP",
    "source": "manual",
    "recorded_at": "2026-04-25T10:00:00Z"
  },
  "message": "Pricing record created successfully"
}
```

---

## Compatibility

### `POST /compatibility/check`
Check compatibility across a list of component IDs.

Headers:
```http
Authorization: Bearer <access_token>
```

Request body:
```json
{
  "component_ids": [1, 2, 3, 4]
}
```

Response `200`:
```json
{
  "data": {
    "compatible": false,
    "conflicts": [
      {
        "component_a_id": 1,
        "component_b_id": 2,
        "reason": "Socket mismatch"
      }
    ]
  },
  "message": "Compatibility check completed"
}
```

Notes:
- Rules are checked both directions
- A missing rule is treated as no conflict

---

## Builds

### `POST /builds`
Create a build with selected components and `price_at_save`.

Headers:
```http
Authorization: Bearer <access_token>
```

Request body:
```json
{
  "build_name": "Budget Gaming PC",
  "intended_workload": "gaming",
  "is_public": false,
  "components": [
    {
      "component_id": 1,
      "quantity": 1,
      "price_at_save": 6650
    },
    {
      "component_id": 2,
      "quantity": 1,
      "price_at_save": 3200
    }
  ]
}
```

Response `201`:
```json
{
  "data": {
    "build_id": 1,
    "user_id": 1,
    "build_name": "Budget Gaming PC",
    "intended_workload": "gaming",
    "total_price": 9850,
    "is_public": false,
    "created_at": "2026-04-25T10:00:00Z",
    "updated_at": "2026-04-25T10:00:00Z",
    "components": [
      {
        "build_component_id": 1,
        "build_id": 1,
        "component_id": 1,
        "quantity": 1,
        "price_at_save": 6650
      }
    ]
  },
  "message": "Build created successfully"
}
```

### `GET /builds/{build_id}`
Return a build and its selected components.

Headers:
```http
Authorization: Bearer <access_token>
```

Response `200`:
```json
{
  "data": {
    "build_id": 1,
    "user_id": 1,
    "build_name": "Budget Gaming PC",
    "total_price": 9850,
    "components": [
      {
        "build_component_id": 1,
        "build_id": 1,
        "component_id": 1,
        "quantity": 1,
        "price_at_save": 6650,
        "name": "AMD Ryzen 5 5600",
        "brand": "AMD",
        "category": "CPU"
      }
    ]
  },
  "message": "Build detail fetched successfully"
}
```

### `PUT /builds/{build_id}`
Update build metadata and optionally replace the selected component list.

Headers:
```http
Authorization: Bearer <access_token>
```

Request body example:
```json
{
  "build_name": "Updated Budget Build",
  "components": [
    {
      "component_id": 1,
      "quantity": 1,
      "price_at_save": 6650
    }
  ]
}
```

Response `200`:
```json
{
  "data": { },
  "message": "Build updated successfully"
}
```

### `DELETE /builds/{build_id}`
Permanently delete a build.

Headers:
```http
Authorization: Bearer <access_token>
```

Response `200`:
```json
{
  "data": {
    "build_id": 1
  },
  "message": "Build deleted successfully"
}
```

---

## Recommendations

### `POST /recommendations`
Generate a budget-aware recommendation with AI + live pricing.

Headers:
```http
Authorization: Bearer <access_token>
```

Request body:
```json
{
  "budget_php": 10000,
  "workload": "gaming",
  "device_type": "desktop"
}
```

Accepted values:
- `workload`: free text, examples include `gaming`, `video_editing`, `general`, `student`, `editing`, `office`, `school`
- `device_type`: `desktop`, `laptop`, `mobile`

Frontend tip:
- You can show a dropdown of suggested workloads, but the backend accepts any non-empty workload string.

Response `200`:
```json
{
  "data": {
    "workload": "gaming",
    "budget_php": 10000,
    "estimated_total_php": 9850,
    "parts": [
      {
        "category": "CPU",
        "name": "AMD Ryzen 5 5600 6-Core Processor",
        "listings": [
          {
            "store": "Datablitz",
            "price": 6650,
            "link": "https://...",
            "status": null
          }
        ]
      }
    ]
  },
  "message": "Recommendation generated successfully"
}
```

Behavior notes:
- The backend checks cached pricing in Supabase first.
- If cached prices are recent, it skips Serper.
- If the budget is tight, lower-priority parts are skipped.
- Parts that would push total price over budget are omitted.
- Parts with no price are excluded from the total.

---

## Common Error Responses

### Validation error `422`
```json
{
  "data": [
    {
      "type": "json_invalid",
      "loc": ["body", 21],
      "msg": "JSON decode error"
    }
  ],
  "message": "Validation error"
}
```

### Unauthorized `401`
```json
{
  "data": null,
  "message": "Authentication required"
}
```

### Not found `404`
```json
{
  "data": null,
  "message": "Component not found"
}
```

### External dependency failure `502`
```json
{
  "data": null,
  "message": "OpenRouter request failed for model openai/gpt-oss-20b:free with status 404"
}
```

## Implementation Notes for Frontend

- Always treat the outer envelope as the contract.
- Use the `data` field for the actual payload.
- Use `message` for toast/alerts.
- For protected routes, reuse the stored JWT from login.
- For recommendation results, render only the parts returned in `data.parts`.
- Do not assume every requested part will be returned when the budget is low.
