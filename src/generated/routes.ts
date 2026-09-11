/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UsersController } from './../modules/users/users.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UserGroupsController } from './../modules/user-groups/user-groups.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SetupController } from './../modules/setup/setup.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ServiceAccountsController } from './../modules/service-accounts/service-accounts.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PrincipalController } from './../modules/principal/principal.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MemberClaimsController } from './../modules/member-claims/member-claims.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ClaimExchangeController } from './../modules/member-claims/claim-exchange.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { HealthController } from './../modules/health/health.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { EventsController } from './../modules/events/events.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { EventRolesController } from './../modules/event-roles/event-roles.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SyncIssuesController } from './../modules/event-members/sync-issues.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ExternalMembersController } from './../modules/event-members/external-members.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { EventMembersController } from './../modules/event-members/event-members.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { EventGroupsController } from './../modules/event-groups/event-groups.controller.js';
import { expressAuthentication } from './../shared/auth/authorization.js';
// @ts-ignore - no great way to install types from subpackage
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';

const expressAuthenticationRecasted = expressAuthentication as (req: ExRequest, securityName: string, scopes?: string[], res?: ExResponse) => Promise<any>;


// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "ProblemFieldError": {
        "dataType": "refObject",
        "properties": {
            "field": {"dataType":"string","required":true},
            "code": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProblemDetails": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"string","required":true},
            "title": {"dataType":"string","required":true},
            "status": {"dataType":"double","required":true},
            "detail": {"dataType":"string","required":true},
            "code": {"dataType":"string","required":true},
            "traceId": {"dataType":"string","required":true},
            "errors": {"dataType":"array","array":{"dataType":"refObject","ref":"ProblemFieldError"}},
            "currentVersion": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Uuid": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{"pattern":{"value":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "displayName": {"dataType":"string","required":true},
            "email": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "createdAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PageInfo": {
        "dataType": "refObject",
        "properties": {
            "nextCursor": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "hasMore": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"UserDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Permission": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["users.read"]},{"dataType":"enum","enums":["users.manage"]},{"dataType":"enum","enums":["user-groups.read"]},{"dataType":"enum","enums":["user-groups.manage"]},{"dataType":"enum","enums":["events.read"]},{"dataType":"enum","enums":["events.manage"]},{"dataType":"enum","enums":["events.reactivate"]},{"dataType":"enum","enums":["members.read"]},{"dataType":"enum","enums":["members.manage"]},{"dataType":"enum","enums":["members.sync"]},{"dataType":"enum","enums":["member-claims.create"]},{"dataType":"enum","enums":["missions.read"]},{"dataType":"enum","enums":["missions.edit"]},{"dataType":"enum","enums":["missions.publish"]},{"dataType":"enum","enums":["artifacts.generate"]},{"dataType":"enum","enums":["artifacts.download"]},{"dataType":"enum","enums":["service-accounts.manage"]},{"dataType":"enum","enums":["audit.read"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PermissionGrantDto": {
        "dataType": "refObject",
        "properties": {
            "permission": {"ref":"Permission","required":true},
            "eventId": {"dataType":"union","subSchemas":[{"ref":"Uuid"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserGroupDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "slug": {"dataType":"string","required":true},
            "system": {"dataType":"boolean","required":true},
            "version": {"dataType":"double","required":true},
            "memberCount": {"dataType":"double","required":true},
            "permissions": {"dataType":"array","array":{"dataType":"refObject","ref":"PermissionGrantDto"},"required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserGroupPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"UserGroupDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Slug": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{"pattern":{"value":"^[a-z0-9]+(?:-[a-z0-9]+)*$"},"minLength":{"value":1},"maxLength":{"value":64}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateUserGroupRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "slug": {"ref":"Slug","required":true},
            "permissions": {"dataType":"array","array":{"dataType":"refObject","ref":"PermissionGrantDto"},"required":true,"validators":{"maxItems":{"value":200}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateUserGroupRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "slug": {"ref":"Slug","required":true},
            "permissions": {"dataType":"array","array":{"dataType":"refObject","ref":"PermissionGrantDto"},"required":true,"validators":{"maxItems":{"value":200}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetupResponse": {
        "dataType": "refObject",
        "properties": {
            "user": {"dataType":"nestedObjectLiteral","nestedProperties":{"email":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetupRequest": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "password": {"dataType":"string","required":true,"validators":{"minLength":{"value":12},"maxLength":{"value":128}}},
            "token": {"dataType":"string","required":true,"validators":{"minLength":{"value":48},"maxLength":{"value":128}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ServiceAccountStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["active"]},{"dataType":"enum","enums":["disabled"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ServiceAccountDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "status": {"ref":"ServiceAccountStatus","required":true},
            "version": {"dataType":"double","required":true},
            "permissions": {"dataType":"array","array":{"dataType":"refObject","ref":"PermissionGrantDto"},"required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ServiceAccountPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"ServiceAccountDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateServiceAccountRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":500}}},
            "permissions": {"dataType":"array","array":{"dataType":"refObject","ref":"PermissionGrantDto"},"required":true,"validators":{"maxItems":{"value":100}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateServiceAccountRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":500}}},
            "status": {"ref":"ServiceAccountStatus","required":true},
            "permissions": {"dataType":"array","array":{"dataType":"refObject","ref":"PermissionGrantDto"},"required":true,"validators":{"maxItems":{"value":100}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiKeyStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["active"]},{"dataType":"enum","enums":["expired"]},{"dataType":"enum","enums":["revoked"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiKeyDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "serviceAccountId": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "displayPrefix": {"dataType":"string","required":true},
            "status": {"ref":"ApiKeyStatus","required":true},
            "expiresAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "lastUsedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "revokedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "createdAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiKeyPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"ApiKeyDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatedApiKeyResponse": {
        "dataType": "refObject",
        "properties": {
            "apiKey": {"ref":"ApiKeyDto","required":true},
            "key": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateApiKeyRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "expiresAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PrincipalDto": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["user"]},{"dataType":"enum","enums":["service-account"]}],"required":true},
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "permissions": {"dataType":"array","array":{"dataType":"refObject","ref":"PermissionGrantDto"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MemberClaimStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["open"]},{"dataType":"enum","enums":["consumed"]},{"dataType":"enum","enums":["revoked"]},{"dataType":"enum","enums":["expired"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MemberClaimDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "eventId": {"ref":"Uuid","required":true},
            "memberId": {"ref":"Uuid","required":true},
            "status": {"ref":"MemberClaimStatus","required":true},
            "expiresAt": {"dataType":"string","required":true},
            "consumedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "revokedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "createdAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatedMemberClaimResponse": {
        "dataType": "refObject",
        "properties": {
            "claim": {"ref":"MemberClaimDto","required":true},
            "token": {"dataType":"string","required":true},
            "claimUrl": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClaimExchangeResponse": {
        "dataType": "refObject",
        "properties": {
            "user": {"dataType":"nestedObjectLiteral","nestedProperties":{"displayName":{"dataType":"string","required":true},"id":{"ref":"Uuid","required":true}},"required":true},
            "eventId": {"ref":"Uuid","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClaimExchangeRequest": {
        "dataType": "refObject",
        "properties": {
            "token": {"dataType":"string","required":true,"validators":{"maxLength":{"value":200}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "HealthResponse": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["ok"],"required":true},
            "service": {"dataType":"enum","enums":["openmeshtak"],"required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["draft"]},{"dataType":"enum","enums":["active"]},{"dataType":"enum","enums":["archived"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "slug": {"dataType":"string","required":true},
            "timeZone": {"dataType":"string","required":true},
            "status": {"ref":"EventStatus","required":true},
            "version": {"dataType":"double","required":true},
            "startsAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "endsAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"EventDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateEventRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "slug": {"ref":"Slug","required":true},
            "timeZone": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":64}}},
            "startsAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "endsAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateEventRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "slug": {"ref":"Slug","required":true},
            "timeZone": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":64}}},
            "startsAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "endsAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventTransitionRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventRoleDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "eventId": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "slug": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "version": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventRolePage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"EventRoleDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateEventRoleRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "slug": {"ref":"Slug","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":500}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateEventRoleRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "slug": {"ref":"Slug","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":500}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SyncIssueStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["open"]},{"dataType":"enum","enums":["resolved"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SyncIssueReason": {
        "dataType": "refObject",
        "properties": {
            "field": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["eventRole"]},{"dataType":"enum","enums":["group"]},{"dataType":"enum","enums":["callsign"]},{"dataType":"enum","enums":["shortName"]}],"required":true},
            "code": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["NOT_FOUND"]},{"dataType":"enum","enums":["CONFLICT"]},{"dataType":"enum","enums":["TOO_LONG"]},{"dataType":"enum","enums":["EXHAUSTED"]}],"required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SyncIssueDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "eventId": {"ref":"Uuid","required":true},
            "provider": {"dataType":"string","required":true},
            "externalId": {"dataType":"string","required":true},
            "status": {"ref":"SyncIssueStatus","required":true},
            "username": {"dataType":"string","required":true},
            "requestedRole": {"dataType":"string","required":true},
            "requestedGroup": {"dataType":"string","required":true},
            "reasons": {"dataType":"array","array":{"dataType":"refObject","ref":"SyncIssueReason"},"required":true},
            "occurrences": {"dataType":"double","required":true},
            "resolvedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SyncIssuePage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"SyncIssueDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventAssignmentSummary": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "slug": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventMemberDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "eventId": {"ref":"Uuid","required":true},
            "userId": {"ref":"Uuid","required":true},
            "displayName": {"dataType":"string","required":true},
            "username": {"dataType":"string","required":true},
            "callsign": {"dataType":"string","required":true},
            "callsignOverride": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "shortName": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "eventRole": {"ref":"EventAssignmentSummary","required":true},
            "eventGroup": {"ref":"EventAssignmentSummary","required":true},
            "version": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MemberSyncOutcome": {
        "dataType": "refObject",
        "properties": {
            "outcome": {"dataType":"enum","enums":["member"],"required":true},
            "change": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["created"]},{"dataType":"enum","enums":["updated"]},{"dataType":"enum","enums":["unchanged"]}],"required":true},
            "member": {"ref":"EventMemberDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SyncIssueOutcome": {
        "dataType": "refObject",
        "properties": {
            "outcome": {"dataType":"enum","enums":["sync-issue"],"required":true},
            "syncIssue": {"ref":"SyncIssueDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ExternalMemberSyncResult": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"MemberSyncOutcome"},{"ref":"SyncIssueOutcome"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RetrySyncIssueRequest": {
        "dataType": "refObject",
        "properties": {
            "callsignOverride": {"dataType":"string","validators":{"minLength":{"value":1},"maxLength":{"value":39}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ExternalProvider": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{"pattern":{"value":"^[a-z0-9][a-z0-9-]{0,31}$"}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ExternalId": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{"pattern":{"value":"^[A-Za-z0-9._:@-]{1,128}$"}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ExternalMemberSyncRequest": {
        "dataType": "refObject",
        "properties": {
            "username": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "eventRole": {"ref":"Slug","required":true},
            "group": {"ref":"Slug","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventMemberPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"EventMemberDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakTeam": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["White"]},{"dataType":"enum","enums":["Yellow"]},{"dataType":"enum","enums":["Orange"]},{"dataType":"enum","enums":["Magenta"]},{"dataType":"enum","enums":["Red"]},{"dataType":"enum","enums":["Maroon"]},{"dataType":"enum","enums":["Purple"]},{"dataType":"enum","enums":["Dark Blue"]},{"dataType":"enum","enums":["Blue"]},{"dataType":"enum","enums":["Cyan"]},{"dataType":"enum","enums":["Teal"]},{"dataType":"enum","enums":["Green"]},{"dataType":"enum","enums":["Dark Green"]},{"dataType":"enum","enums":["Brown"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakRole": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["Team Member"]},{"dataType":"enum","enums":["Team Lead"]},{"dataType":"enum","enums":["HQ"]},{"dataType":"enum","enums":["Sniper"]},{"dataType":"enum","enums":["Medic"]},{"dataType":"enum","enums":["Forward Observer"]},{"dataType":"enum","enums":["RTO"]},{"dataType":"enum","enums":["K9"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProvisioningName": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{"pattern":{"value":"^[A-Za-z0-9_-]+$"},"minLength":{"value":1},"maxLength":{"value":64}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MeshtasticDeviceRole": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["CLIENT"]},{"dataType":"enum","enums":["CLIENT_MUTE"]},{"dataType":"enum","enums":["CLIENT_HIDDEN"]},{"dataType":"enum","enums":["CLIENT_BASE"]},{"dataType":"enum","enums":["ROUTER"]},{"dataType":"enum","enums":["ROUTER_LATE"]},{"dataType":"enum","enums":["TRACKER"]},{"dataType":"enum","enums":["SENSOR"]},{"dataType":"enum","enums":["TAK"]},{"dataType":"enum","enums":["TAK_TRACKER"]},{"dataType":"enum","enums":["LOST_AND_FOUND"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MeshtasticChannelName": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{"pattern":{"value":"^[A-Za-z0-9_-]{1,11}$"}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GroupProvisioning": {
        "dataType": "refObject",
        "properties": {
            "callsignFormat": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":64}}},
            "shortNamePrefix": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"pattern":{"value":"^[A-Z0-9]{1,3}$"}}},
            "tak": {"dataType":"nestedObjectLiteral","nestedProperties":{"serverGroups":{"dataType":"array","array":{"dataType":"refAlias","ref":"ProvisioningName"},"required":true,"validators":{"maxItems":{"value":20}}},"role":{"ref":"TakRole","required":true},"team":{"ref":"TakTeam","required":true}},"required":true},
            "meshtastic": {"dataType":"nestedObjectLiteral","nestedProperties":{"channels":{"dataType":"array","array":{"dataType":"refAlias","ref":"MeshtasticChannelName"},"required":true,"validators":{"maxItems":{"value":8}}},"deviceRole":{"ref":"MeshtasticDeviceRole","required":true}},"required":true},
            "missionGroups": {"dataType":"array","array":{"dataType":"refAlias","ref":"ProvisioningName"},"required":true,"validators":{"maxItems":{"value":20}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventGroupDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "eventId": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "slug": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "provisioning": {"ref":"GroupProvisioning","required":true},
            "version": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventGroupPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"EventGroupDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateEventGroupRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "slug": {"ref":"Slug","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":500}}},
            "provisioning": {"ref":"GroupProvisioning"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateEventGroupRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "slug": {"ref":"Slug","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":500}}},
            "provisioning": {"ref":"GroupProvisioning","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsUsersController_listUsers: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/users',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.listUsers)),

            async function UsersController_listUsers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_listUsers, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'listUsers',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_getUser: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/users/:userId',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.getUser)),

            async function UsersController_getUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_getUser, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'getUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserGroupsController_listUserGroups: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/user-groups',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController.prototype.listUserGroups)),

            async function UserGroupsController_listUserGroups(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserGroupsController_listUserGroups, request, response });

                const controller = new UserGroupsController();

              await templateService.apiHandler({
                methodName: 'listUserGroups',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserGroupsController_createUserGroup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateUserGroupRequest"},
        };
        app.post('/api/v1/user-groups',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController.prototype.createUserGroup)),

            async function UserGroupsController_createUserGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserGroupsController_createUserGroup, request, response });

                const controller = new UserGroupsController();

              await templateService.apiHandler({
                methodName: 'createUserGroup',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserGroupsController_getUserGroup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userGroupId: {"in":"path","name":"userGroupId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/user-groups/:userGroupId',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController.prototype.getUserGroup)),

            async function UserGroupsController_getUserGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserGroupsController_getUserGroup, request, response });

                const controller = new UserGroupsController();

              await templateService.apiHandler({
                methodName: 'getUserGroup',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserGroupsController_updateUserGroup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userGroupId: {"in":"path","name":"userGroupId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateUserGroupRequest"},
        };
        app.put('/api/v1/user-groups/:userGroupId',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController.prototype.updateUserGroup)),

            async function UserGroupsController_updateUserGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserGroupsController_updateUserGroup, request, response });

                const controller = new UserGroupsController();

              await templateService.apiHandler({
                methodName: 'updateUserGroup',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserGroupsController_deleteUserGroup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userGroupId: {"in":"path","name":"userGroupId","required":true,"ref":"Uuid"},
        };
        app.delete('/api/v1/user-groups/:userGroupId',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController.prototype.deleteUserGroup)),

            async function UserGroupsController_deleteUserGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserGroupsController_deleteUserGroup, request, response });

                const controller = new UserGroupsController();

              await templateService.apiHandler({
                methodName: 'deleteUserGroup',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 204,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserGroupsController_listUserGroupMembers: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userGroupId: {"in":"path","name":"userGroupId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/user-groups/:userGroupId/members',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController.prototype.listUserGroupMembers)),

            async function UserGroupsController_listUserGroupMembers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserGroupsController_listUserGroupMembers, request, response });

                const controller = new UserGroupsController();

              await templateService.apiHandler({
                methodName: 'listUserGroupMembers',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserGroupsController_addUserGroupMember: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userGroupId: {"in":"path","name":"userGroupId","required":true,"ref":"Uuid"},
                userId: {"in":"path","name":"userId","required":true,"ref":"Uuid"},
        };
        app.put('/api/v1/user-groups/:userGroupId/members/:userId',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController.prototype.addUserGroupMember)),

            async function UserGroupsController_addUserGroupMember(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserGroupsController_addUserGroupMember, request, response });

                const controller = new UserGroupsController();

              await templateService.apiHandler({
                methodName: 'addUserGroupMember',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 204,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserGroupsController_removeUserGroupMember: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userGroupId: {"in":"path","name":"userGroupId","required":true,"ref":"Uuid"},
                userId: {"in":"path","name":"userId","required":true,"ref":"Uuid"},
        };
        app.delete('/api/v1/user-groups/:userGroupId/members/:userId',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(UserGroupsController.prototype.removeUserGroupMember)),

            async function UserGroupsController_removeUserGroupMember(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserGroupsController_removeUserGroupMember, request, response });

                const controller = new UserGroupsController();

              await templateService.apiHandler({
                methodName: 'removeUserGroupMember',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 204,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSetupController_createAdministrator: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"SetupRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/v1/setup',
            ...(fetchMiddlewares<RequestHandler>(SetupController)),
            ...(fetchMiddlewares<RequestHandler>(SetupController.prototype.createAdministrator)),

            async function SetupController_createAdministrator(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSetupController_createAdministrator, request, response });

                const controller = new SetupController();

              await templateService.apiHandler({
                methodName: 'createAdministrator',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsServiceAccountsController_listServiceAccounts: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/service-accounts',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController)),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController.prototype.listServiceAccounts)),

            async function ServiceAccountsController_listServiceAccounts(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsServiceAccountsController_listServiceAccounts, request, response });

                const controller = new ServiceAccountsController();

              await templateService.apiHandler({
                methodName: 'listServiceAccounts',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsServiceAccountsController_createServiceAccount: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateServiceAccountRequest"},
        };
        app.post('/api/v1/service-accounts',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController)),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController.prototype.createServiceAccount)),

            async function ServiceAccountsController_createServiceAccount(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsServiceAccountsController_createServiceAccount, request, response });

                const controller = new ServiceAccountsController();

              await templateService.apiHandler({
                methodName: 'createServiceAccount',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsServiceAccountsController_getServiceAccount: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                serviceAccountId: {"in":"path","name":"serviceAccountId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/service-accounts/:serviceAccountId',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController)),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController.prototype.getServiceAccount)),

            async function ServiceAccountsController_getServiceAccount(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsServiceAccountsController_getServiceAccount, request, response });

                const controller = new ServiceAccountsController();

              await templateService.apiHandler({
                methodName: 'getServiceAccount',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsServiceAccountsController_updateServiceAccount: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                serviceAccountId: {"in":"path","name":"serviceAccountId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateServiceAccountRequest"},
        };
        app.put('/api/v1/service-accounts/:serviceAccountId',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController)),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController.prototype.updateServiceAccount)),

            async function ServiceAccountsController_updateServiceAccount(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsServiceAccountsController_updateServiceAccount, request, response });

                const controller = new ServiceAccountsController();

              await templateService.apiHandler({
                methodName: 'updateServiceAccount',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsServiceAccountsController_listApiKeys: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                serviceAccountId: {"in":"path","name":"serviceAccountId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/service-accounts/:serviceAccountId/api-keys',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController)),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController.prototype.listApiKeys)),

            async function ServiceAccountsController_listApiKeys(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsServiceAccountsController_listApiKeys, request, response });

                const controller = new ServiceAccountsController();

              await templateService.apiHandler({
                methodName: 'listApiKeys',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsServiceAccountsController_createApiKey: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                serviceAccountId: {"in":"path","name":"serviceAccountId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateApiKeyRequest"},
        };
        app.post('/api/v1/service-accounts/:serviceAccountId/api-keys',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController)),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController.prototype.createApiKey)),

            async function ServiceAccountsController_createApiKey(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsServiceAccountsController_createApiKey, request, response });

                const controller = new ServiceAccountsController();

              await templateService.apiHandler({
                methodName: 'createApiKey',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsServiceAccountsController_revokeApiKey: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                serviceAccountId: {"in":"path","name":"serviceAccountId","required":true,"ref":"Uuid"},
                apiKeyId: {"in":"path","name":"apiKeyId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/service-accounts/:serviceAccountId/api-keys/:apiKeyId/revoke',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController)),
            ...(fetchMiddlewares<RequestHandler>(ServiceAccountsController.prototype.revokeApiKey)),

            async function ServiceAccountsController_revokeApiKey(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsServiceAccountsController_revokeApiKey, request, response });

                const controller = new ServiceAccountsController();

              await templateService.apiHandler({
                methodName: 'revokeApiKey',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPrincipalController_getPrincipal: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/principal',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PrincipalController)),
            ...(fetchMiddlewares<RequestHandler>(PrincipalController.prototype.getPrincipal)),

            async function PrincipalController_getPrincipal(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPrincipalController_getPrincipal, request, response });

                const controller = new PrincipalController();

              await templateService.apiHandler({
                methodName: 'getPrincipal',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMemberClaimsController_listMemberClaims: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                memberId: {"in":"path","name":"memberId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/members/:memberId/claims',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MemberClaimsController)),
            ...(fetchMiddlewares<RequestHandler>(MemberClaimsController.prototype.listMemberClaims)),

            async function MemberClaimsController_listMemberClaims(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMemberClaimsController_listMemberClaims, request, response });

                const controller = new MemberClaimsController();

              await templateService.apiHandler({
                methodName: 'listMemberClaims',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMemberClaimsController_createMemberClaim: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                memberId: {"in":"path","name":"memberId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/events/:eventId/members/:memberId/claims',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MemberClaimsController)),
            ...(fetchMiddlewares<RequestHandler>(MemberClaimsController.prototype.createMemberClaim)),

            async function MemberClaimsController_createMemberClaim(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMemberClaimsController_createMemberClaim, request, response });

                const controller = new MemberClaimsController();

              await templateService.apiHandler({
                methodName: 'createMemberClaim',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMemberClaimsController_revokeMemberClaim: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                memberId: {"in":"path","name":"memberId","required":true,"ref":"Uuid"},
                claimId: {"in":"path","name":"claimId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/events/:eventId/members/:memberId/claims/:claimId/revoke',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MemberClaimsController)),
            ...(fetchMiddlewares<RequestHandler>(MemberClaimsController.prototype.revokeMemberClaim)),

            async function MemberClaimsController_revokeMemberClaim(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMemberClaimsController_revokeMemberClaim, request, response });

                const controller = new MemberClaimsController();

              await templateService.apiHandler({
                methodName: 'revokeMemberClaim',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsClaimExchangeController_exchangeClaim: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"ClaimExchangeRequest"},
        };
        app.post('/api/v1/auth/claims/exchange',
            ...(fetchMiddlewares<RequestHandler>(ClaimExchangeController)),
            ...(fetchMiddlewares<RequestHandler>(ClaimExchangeController.prototype.exchangeClaim)),

            async function ClaimExchangeController_exchangeClaim(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsClaimExchangeController_exchangeClaim, request, response });

                const controller = new ClaimExchangeController();

              await templateService.apiHandler({
                methodName: 'exchangeClaim',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsHealthController_getHealth: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/v1/health',
            ...(fetchMiddlewares<RequestHandler>(HealthController)),
            ...(fetchMiddlewares<RequestHandler>(HealthController.prototype.getHealth)),

            async function HealthController_getHealth(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsHealthController_getHealth, request, response });

                const controller = new HealthController();

              await templateService.apiHandler({
                methodName: 'getHealth',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventsController_listEvents: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
                status: {"in":"query","name":"status","ref":"EventStatus"},
        };
        app.get('/api/v1/events',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventsController)),
            ...(fetchMiddlewares<RequestHandler>(EventsController.prototype.listEvents)),

            async function EventsController_listEvents(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventsController_listEvents, request, response });

                const controller = new EventsController();

              await templateService.apiHandler({
                methodName: 'listEvents',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventsController_createEvent: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateEventRequest"},
        };
        app.post('/api/v1/events',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventsController)),
            ...(fetchMiddlewares<RequestHandler>(EventsController.prototype.createEvent)),

            async function EventsController_createEvent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventsController_createEvent, request, response });

                const controller = new EventsController();

              await templateService.apiHandler({
                methodName: 'createEvent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventsController_getEvent: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventsController)),
            ...(fetchMiddlewares<RequestHandler>(EventsController.prototype.getEvent)),

            async function EventsController_getEvent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventsController_getEvent, request, response });

                const controller = new EventsController();

              await templateService.apiHandler({
                methodName: 'getEvent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventsController_updateEvent: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateEventRequest"},
        };
        app.put('/api/v1/events/:eventId',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventsController)),
            ...(fetchMiddlewares<RequestHandler>(EventsController.prototype.updateEvent)),

            async function EventsController_updateEvent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventsController_updateEvent, request, response });

                const controller = new EventsController();

              await templateService.apiHandler({
                methodName: 'updateEvent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventsController_activateEvent: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"EventTransitionRequest"},
        };
        app.post('/api/v1/events/:eventId/activate',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventsController)),
            ...(fetchMiddlewares<RequestHandler>(EventsController.prototype.activateEvent)),

            async function EventsController_activateEvent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventsController_activateEvent, request, response });

                const controller = new EventsController();

              await templateService.apiHandler({
                methodName: 'activateEvent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventsController_archiveEvent: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"EventTransitionRequest"},
        };
        app.post('/api/v1/events/:eventId/archive',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventsController)),
            ...(fetchMiddlewares<RequestHandler>(EventsController.prototype.archiveEvent)),

            async function EventsController_archiveEvent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventsController_archiveEvent, request, response });

                const controller = new EventsController();

              await templateService.apiHandler({
                methodName: 'archiveEvent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventsController_reactivateEvent: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"EventTransitionRequest"},
        };
        app.post('/api/v1/events/:eventId/reactivate',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventsController)),
            ...(fetchMiddlewares<RequestHandler>(EventsController.prototype.reactivateEvent)),

            async function EventsController_reactivateEvent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventsController_reactivateEvent, request, response });

                const controller = new EventsController();

              await templateService.apiHandler({
                methodName: 'reactivateEvent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventRolesController_listEventRoles: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/events/:eventId/roles',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventRolesController)),
            ...(fetchMiddlewares<RequestHandler>(EventRolesController.prototype.listEventRoles)),

            async function EventRolesController_listEventRoles(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventRolesController_listEventRoles, request, response });

                const controller = new EventRolesController();

              await templateService.apiHandler({
                methodName: 'listEventRoles',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventRolesController_createEventRole: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateEventRoleRequest"},
        };
        app.post('/api/v1/events/:eventId/roles',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventRolesController)),
            ...(fetchMiddlewares<RequestHandler>(EventRolesController.prototype.createEventRole)),

            async function EventRolesController_createEventRole(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventRolesController_createEventRole, request, response });

                const controller = new EventRolesController();

              await templateService.apiHandler({
                methodName: 'createEventRole',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventRolesController_getEventRole: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                roleId: {"in":"path","name":"roleId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/roles/:roleId',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventRolesController)),
            ...(fetchMiddlewares<RequestHandler>(EventRolesController.prototype.getEventRole)),

            async function EventRolesController_getEventRole(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventRolesController_getEventRole, request, response });

                const controller = new EventRolesController();

              await templateService.apiHandler({
                methodName: 'getEventRole',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventRolesController_updateEventRole: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                roleId: {"in":"path","name":"roleId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateEventRoleRequest"},
        };
        app.put('/api/v1/events/:eventId/roles/:roleId',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventRolesController)),
            ...(fetchMiddlewares<RequestHandler>(EventRolesController.prototype.updateEventRole)),

            async function EventRolesController_updateEventRole(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventRolesController_updateEventRole, request, response });

                const controller = new EventRolesController();

              await templateService.apiHandler({
                methodName: 'updateEventRole',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventRolesController_deleteEventRole: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                roleId: {"in":"path","name":"roleId","required":true,"ref":"Uuid"},
        };
        app.delete('/api/v1/events/:eventId/roles/:roleId',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventRolesController)),
            ...(fetchMiddlewares<RequestHandler>(EventRolesController.prototype.deleteEventRole)),

            async function EventRolesController_deleteEventRole(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventRolesController_deleteEventRole, request, response });

                const controller = new EventRolesController();

              await templateService.apiHandler({
                methodName: 'deleteEventRole',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 204,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSyncIssuesController_listSyncIssues: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
                status: {"in":"query","name":"status","ref":"SyncIssueStatus"},
        };
        app.get('/api/v1/events/:eventId/sync-issues',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SyncIssuesController)),
            ...(fetchMiddlewares<RequestHandler>(SyncIssuesController.prototype.listSyncIssues)),

            async function SyncIssuesController_listSyncIssues(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSyncIssuesController_listSyncIssues, request, response });

                const controller = new SyncIssuesController();

              await templateService.apiHandler({
                methodName: 'listSyncIssues',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSyncIssuesController_retrySyncIssue: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                syncIssueId: {"in":"path","name":"syncIssueId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"RetrySyncIssueRequest"},
        };
        app.post('/api/v1/events/:eventId/sync-issues/:syncIssueId/retry',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SyncIssuesController)),
            ...(fetchMiddlewares<RequestHandler>(SyncIssuesController.prototype.retrySyncIssue)),

            async function SyncIssuesController_retrySyncIssue(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSyncIssuesController_retrySyncIssue, request, response });

                const controller = new SyncIssuesController();

              await templateService.apiHandler({
                methodName: 'retrySyncIssue',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsExternalMembersController_syncExternalMember: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                provider: {"in":"path","name":"provider","required":true,"ref":"ExternalProvider"},
                externalId: {"in":"path","name":"externalId","required":true,"ref":"ExternalId"},
                body: {"in":"body","name":"body","required":true,"ref":"ExternalMemberSyncRequest"},
        };
        app.put('/api/v1/events/:eventId/external-members/:provider/:externalId',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ExternalMembersController)),
            ...(fetchMiddlewares<RequestHandler>(ExternalMembersController.prototype.syncExternalMember)),

            async function ExternalMembersController_syncExternalMember(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsExternalMembersController_syncExternalMember, request, response });

                const controller = new ExternalMembersController();

              await templateService.apiHandler({
                methodName: 'syncExternalMember',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventMembersController_listEventMembers: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/events/:eventId/members',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventMembersController)),
            ...(fetchMiddlewares<RequestHandler>(EventMembersController.prototype.listEventMembers)),

            async function EventMembersController_listEventMembers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventMembersController_listEventMembers, request, response });

                const controller = new EventMembersController();

              await templateService.apiHandler({
                methodName: 'listEventMembers',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventMembersController_getEventMember: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                memberId: {"in":"path","name":"memberId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/members/:memberId',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventMembersController)),
            ...(fetchMiddlewares<RequestHandler>(EventMembersController.prototype.getEventMember)),

            async function EventMembersController_getEventMember(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventMembersController_getEventMember, request, response });

                const controller = new EventMembersController();

              await templateService.apiHandler({
                methodName: 'getEventMember',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventMembersController_deleteEventMember: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                memberId: {"in":"path","name":"memberId","required":true,"ref":"Uuid"},
        };
        app.delete('/api/v1/events/:eventId/members/:memberId',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventMembersController)),
            ...(fetchMiddlewares<RequestHandler>(EventMembersController.prototype.deleteEventMember)),

            async function EventMembersController_deleteEventMember(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventMembersController_deleteEventMember, request, response });

                const controller = new EventMembersController();

              await templateService.apiHandler({
                methodName: 'deleteEventMember',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 204,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventGroupsController_listEventGroups: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/events/:eventId/groups',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(EventGroupsController.prototype.listEventGroups)),

            async function EventGroupsController_listEventGroups(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventGroupsController_listEventGroups, request, response });

                const controller = new EventGroupsController();

              await templateService.apiHandler({
                methodName: 'listEventGroups',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventGroupsController_createEventGroup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateEventGroupRequest"},
        };
        app.post('/api/v1/events/:eventId/groups',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(EventGroupsController.prototype.createEventGroup)),

            async function EventGroupsController_createEventGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventGroupsController_createEventGroup, request, response });

                const controller = new EventGroupsController();

              await templateService.apiHandler({
                methodName: 'createEventGroup',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventGroupsController_getEventGroup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                groupId: {"in":"path","name":"groupId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/groups/:groupId',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(EventGroupsController.prototype.getEventGroup)),

            async function EventGroupsController_getEventGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventGroupsController_getEventGroup, request, response });

                const controller = new EventGroupsController();

              await templateService.apiHandler({
                methodName: 'getEventGroup',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventGroupsController_updateEventGroup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                groupId: {"in":"path","name":"groupId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateEventGroupRequest"},
        };
        app.put('/api/v1/events/:eventId/groups/:groupId',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(EventGroupsController.prototype.updateEventGroup)),

            async function EventGroupsController_updateEventGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventGroupsController_updateEventGroup, request, response });

                const controller = new EventGroupsController();

              await templateService.apiHandler({
                methodName: 'updateEventGroup',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsEventGroupsController_deleteEventGroup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                groupId: {"in":"path","name":"groupId","required":true,"ref":"Uuid"},
        };
        app.delete('/api/v1/events/:eventId/groups/:groupId',
            authenticateMiddleware([{"sessionCookie":[]},{"serviceAccountBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(EventGroupsController.prototype.deleteEventGroup)),

            async function EventGroupsController_deleteEventGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventGroupsController_deleteEventGroup, request, response });

                const controller = new EventGroupsController();

              await templateService.apiHandler({
                methodName: 'deleteEventGroup',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 204,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return async function runAuthenticationMiddleware(request: any, response: any, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            // keep track of failed auth attempts so we can hand back the most
            // recent one.  This behavior was previously existing so preserving it
            // here
            const failedAttempts: any[] = [];
            const pushAndRethrow = (error: any) => {
                failedAttempts.push(error);
                throw error;
            };

            const secMethodOrPromises: Promise<any>[] = [];
            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    const secMethodAndPromises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        secMethodAndPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }

                    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                    secMethodOrPromises.push(Promise.all(secMethodAndPromises)
                        .then(users => { return users[0]; }));
                } else {
                    for (const name in secMethod) {
                        secMethodOrPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }
                }
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            try {
                request['user'] = await Promise.any(secMethodOrPromises);

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }

                next();
            }
            catch(err) {
                // Show most recent error as response
                const error = failedAttempts.pop();
                error.status = error.status || 401;

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }
                next(error);
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
