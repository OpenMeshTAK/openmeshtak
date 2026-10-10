/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UsersController } from './../modules/users/users.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SetupLinkExchangeController } from './../modules/users/setup-link-exchange.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UserGroupsController } from './../modules/user-groups/user-groups.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TakTrafficRecordingController } from './../modules/tak-server/traffic-recording.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TakTrafficHistoryController } from './../modules/tak-server/traffic-history.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TakServerSettingsController } from './../modules/tak-server/tak-server-settings.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { LiveTakTrafficController } from './../modules/tak-server/live-traffic.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TakEnrollmentsController } from './../modules/tak-server/enrollment.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TakConnectionPackageController } from './../modules/tak-server/enrollment.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ItakConnectionPackageController } from './../modules/tak-server/enrollment.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { WintakConnectionPackageController } from './../modules/tak-server/enrollment.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TakClientCertificatesController } from './../modules/tak-server/client-certificates.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MyTakCertificatesController } from './../modules/tak-server/client-certificates.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TakCertificateAuthoritiesController } from './../modules/tak-server/certificate-authority.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TakAcmeSettingsController } from './../modules/tak-server/acme-settings.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TakGroupsController } from './../modules/tak-groups/tak-groups.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TakConfigurationController } from './../modules/tak-configuration/tak-configuration.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AtakPreferencesController } from './../modules/tak-configuration/atak-preferences.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AtakPreferenceCatalogController } from './../modules/tak-configuration/atak-preferences.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SetupController } from './../modules/setup/setup.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PresetLibraryController } from './../modules/settings-presets/preset-library.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MeshtasticPresetController } from './../modules/settings-presets/event-presets.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TakPresetController } from './../modules/settings-presets/event-presets.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ServerLogsController } from './../modules/server-logs/server-logs.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { RegistrationController } from './../modules/registration/registration.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { RegistrationSettingsController } from './../modules/registration/registration-admin.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { RegistrationInvitesController } from './../modules/registration/registration-admin.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MemberProfileController } from './../modules/profiles/profiles.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MyEventMembershipsController } from './../modules/profiles/profiles.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ChannelHandoutsController } from './../modules/profiles/channel-handouts.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PrincipalController } from './../modules/principal/principal.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { OfflineSnapshotController } from './../modules/offline-snapshots/offline-snapshot.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FirmwareReleasesController } from './../modules/meshtastic-firmware/firmware-releases.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FirmwareProfilesController } from './../modules/meshtastic-firmware/firmware-profiles.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MeshtasticConfigurationController } from './../modules/meshtastic-configuration/meshtastic-configuration.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MeshtasticChannelsController } from './../modules/meshtastic-channels/meshtastic-channels.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { DeviceProfileController } from './../modules/meshtastic-artifacts/device-profile.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MemberDataPackagesController } from './../modules/member-data-packages/member-data-packages.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MemberClaimsController } from './../modules/member-claims/member-claims.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ClaimExchangeController } from './../modules/member-claims/claim-exchange.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MapSettingsController } from './../modules/map-settings/map-settings.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { InstanceSettingsController } from './../modules/instance-settings/instance-settings.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { IconSettingsController } from './../modules/icon-settings/icon-settings.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { HealthController } from './../modules/health/health.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { EventsController } from './../modules/events/events.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { EventRolesController } from './../modules/event-roles/event-roles.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SyncIssuesController } from './../modules/event-members/sync-issues.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { GroupMemberOrderController } from './../modules/event-members/member-order.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ExternalMembersController } from './../modules/event-members/external-members.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { EventMembersController } from './../modules/event-members/event-members.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { EventGroupsController } from './../modules/event-groups/event-groups.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ConfigurationRevisionsController } from './../modules/event-configuration/configuration-revisions.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { EmailSettingsController } from './../modules/email/email-settings.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { DownloadGrantsController } from './../modules/download-grants/download-grants.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { GrantedDownloadsController } from './../modules/download-grants/download-grants.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PackageRevisionsController } from './../modules/data-packages/package-revisions.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PackagePresentationController } from './../modules/data-packages/package-presentation.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PackageOrderController } from './../modules/data-packages/package-order.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PackageObjectsController } from './../modules/data-packages/package-objects.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PackageNewImportController } from './../modules/data-packages/package-new-import.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PackageLayersController } from './../modules/data-packages/package-layers.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PackageKmlController } from './../modules/data-packages/package-kml.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PackageGeoJsonController } from './../modules/data-packages/package-geojson.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PackageCopyController } from './../modules/data-packages/package-copy.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PackageContentController } from './../modules/data-packages/package-content.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PackageAtakController } from './../modules/data-packages/package-atak.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { IconLibraryController } from './../modules/data-packages/icon-library.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { DataPackagesController } from './../modules/data-packages/data-packages.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CombinedExportController } from './../modules/data-packages/combined-export.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ApiClientsController } from './../modules/api-clients/api-clients.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AccountSetupController } from './../modules/account/account-setup.controller.js';
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
    "UserAccountEvent": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "slug": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserGroupSummary": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "displayName": {"dataType":"string","required":true},
            "username": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "email": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "disabled": {"dataType":"boolean","required":true},
            "passwordSet": {"dataType":"boolean","required":true},
            "accountEvent": {"dataType":"union","subSchemas":[{"ref":"UserAccountEvent"},{"dataType":"enum","enums":[null]}],"required":true},
            "userGroups": {"dataType":"array","array":{"dataType":"refObject","ref":"UserGroupSummary"},"required":true},
            "version": {"dataType":"double","required":true},
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
    "UserAccountType": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["permanent"]},{"dataType":"enum","enums":["event"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetupLinkDto": {
        "dataType": "refObject",
        "properties": {
            "url": {"dataType":"string","required":true},
            "expiresAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatedUserResponse": {
        "dataType": "refObject",
        "properties": {
            "user": {"ref":"UserDto","required":true},
            "setupLink": {"ref":"SetupLinkDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateUserRequest": {
        "dataType": "refObject",
        "properties": {
            "displayName": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "username": {"dataType":"string","validators":{"pattern":{"value":"^[a-z0-9._-]{3,32}$"}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateUserRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "displayName": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "email": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":254},"pattern":{"value":"^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"}}},
            "username": {"dataType":"string","validators":{"pattern":{"value":"^[a-z0-9._-]{3,32}$"}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetupLinkExchangeResponse": {
        "dataType": "refObject",
        "properties": {
            "user": {"dataType":"nestedObjectLiteral","nestedProperties":{"displayName":{"dataType":"string","required":true},"id":{"ref":"Uuid","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetupLinkExchangeRequest": {
        "dataType": "refObject",
        "properties": {
            "token": {"dataType":"string","required":true,"validators":{"maxLength":{"value":200}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Permission": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["users.read"]},{"dataType":"enum","enums":["users.create"]},{"dataType":"enum","enums":["users.edit"]},{"dataType":"enum","enums":["users.set-email"]},{"dataType":"enum","enums":["users.disable"]},{"dataType":"enum","enums":["users.sign-out"]},{"dataType":"enum","enums":["users.password-reset"]},{"dataType":"enum","enums":["users.setup-links"]},{"dataType":"enum","enums":["registration.manage"]},{"dataType":"enum","enums":["user-groups.read"]},{"dataType":"enum","enums":["user-groups.manage"]},{"dataType":"enum","enums":["user-group-members.manage"]},{"dataType":"enum","enums":["events.read"]},{"dataType":"enum","enums":["events.manage"]},{"dataType":"enum","enums":["events.reactivate"]},{"dataType":"enum","enums":["configuration.publish"]},{"dataType":"enum","enums":["event-groups.manage"]},{"dataType":"enum","enums":["event-roles.manage"]},{"dataType":"enum","enums":["tak-settings.manage"]},{"dataType":"enum","enums":["tak-groups.manage"]},{"dataType":"enum","enums":["meshtastic-settings.manage"]},{"dataType":"enum","enums":["meshtastic-channels.manage"]},{"dataType":"enum","enums":["presets.read"]},{"dataType":"enum","enums":["presets.manage"]},{"dataType":"enum","enums":["members.read"]},{"dataType":"enum","enums":["members.manage"]},{"dataType":"enum","enums":["members.sync"]},{"dataType":"enum","enums":["member-accounts.create"]},{"dataType":"enum","enums":["event-accounts.manage"]},{"dataType":"enum","enums":["member-claims.create"]},{"dataType":"enum","enums":["channel-keys.reveal"]},{"dataType":"enum","enums":["data-packages.read"]},{"dataType":"enum","enums":["data-packages.edit"]},{"dataType":"enum","enums":["data-packages.publish"]},{"dataType":"enum","enums":["missions.read"]},{"dataType":"enum","enums":["missions.edit"]},{"dataType":"enum","enums":["missions.publish"]},{"dataType":"enum","enums":["offline-snapshots.prepare"]},{"dataType":"enum","enums":["artifacts.generate"]},{"dataType":"enum","enums":["artifacts.download"]},{"dataType":"enum","enums":["member-artifacts.download"]},{"dataType":"enum","enums":["tak-traffic.view"]},{"dataType":"enum","enums":["tak-traffic.history"]},{"dataType":"enum","enums":["tak-traffic.export"]},{"dataType":"enum","enums":["tak-traffic.delete"]},{"dataType":"enum","enums":["tak-traffic.recording"]},{"dataType":"enum","enums":["api-clients.manage"]},{"dataType":"enum","enums":["tak-server.manage"]},{"dataType":"enum","enums":["tak-server.admin-access"]},{"dataType":"enum","enums":["email.manage"]},{"dataType":"enum","enums":["settings.manage"]},{"dataType":"enum","enums":["audit.read"]},{"dataType":"enum","enums":["server-logs.read"]}],"validators":{}},
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
    "TakTrafficRecordingDto": {
        "dataType": "refObject",
        "properties": {
            "enabled": {"dataType":"boolean","required":true},
            "retentionDays": {"dataType":"double","required":true},
            "storedItems": {"dataType":"double","required":true},
            "version": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateTakTrafficRecordingRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "enabled": {"dataType":"boolean","required":true},
            "retentionDays": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1},"maximum":{"value":365}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakTrackSenderDto": {
        "dataType": "refObject",
        "properties": {
            "userId": {"ref":"Uuid","required":true},
            "displayName": {"dataType":"string","required":true},
            "eventGroupId": {"dataType":"union","subSchemas":[{"ref":"Uuid"},{"dataType":"enum","enums":[null]}],"required":true},
            "eventGroupName": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakTrackPointDto": {
        "dataType": "refObject",
        "properties": {
            "time": {"dataType":"string","required":true},
            "lat": {"dataType":"double","required":true},
            "lon": {"dataType":"double","required":true},
            "ce": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "delayed": {"dataType":"boolean","required":true},
            "approximate": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakTrackDto": {
        "dataType": "refObject",
        "properties": {
            "uid": {"dataType":"string","required":true},
            "type": {"dataType":"string","required":true},
            "callsign": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "selfReported": {"dataType":"boolean","required":true},
            "sender": {"ref":"TakTrackSenderDto","required":true},
            "pointCount": {"dataType":"double","required":true},
            "duplicatesDropped": {"dataType":"double","required":true},
            "segments": {"dataType":"array","array":{"dataType":"array","array":{"dataType":"refObject","ref":"TakTrackPointDto"}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakTrafficHistoryGroupDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakTrafficHistoryDto": {
        "dataType": "refObject",
        "properties": {
            "from": {"dataType":"string","required":true},
            "to": {"dataType":"string","required":true},
            "gapSeconds": {"dataType":"double","required":true},
            "truncated": {"dataType":"boolean","required":true},
            "maxPoints": {"dataType":"double","required":true},
            "tracks": {"dataType":"array","array":{"dataType":"refObject","ref":"TakTrackDto"},"required":true},
            "groups": {"dataType":"array","array":{"dataType":"refObject","ref":"TakTrafficHistoryGroupDto"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakTrafficExportFormat": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["geojson"]},{"dataType":"enum","enums":["gpx"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DeletedTakTrafficDto": {
        "dataType": "refObject",
        "properties": {
            "deleted": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakServerCertificateDto": {
        "dataType": "refObject",
        "properties": {
            "source": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["issued"]},{"dataType":"enum","enums":["added"]},{"dataType":"enum","enums":["acme"]},{"dataType":"enum","enums":["file"]}],"required":true},
            "hostName": {"dataType":"string","required":true},
            "subject": {"dataType":"string","required":true},
            "fingerprintSha256": {"dataType":"string","required":true},
            "notAfter": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakCertificateFilesDto": {
        "dataType": "refObject",
        "properties": {
            "certificateFile": {"dataType":"string","required":true},
            "keyFile": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakServerSettingsDto": {
        "dataType": "refObject",
        "properties": {
            "enabled": {"dataType":"boolean","required":true},
            "hostName": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "enrollmentPort": {"dataType":"double","required":true},
            "martiPort": {"dataType":"double","required":true},
            "streamingPort": {"dataType":"double","required":true},
            "clientCertificateDays": {"dataType":"double","required":true},
            "unusedPackageHours": {"dataType":"double","required":true},
            "serverCertificate": {"dataType":"union","subSchemas":[{"ref":"TakServerCertificateDto"},{"dataType":"enum","enums":[null]}],"required":true},
            "certificateFiles": {"dataType":"union","subSchemas":[{"ref":"TakCertificateFilesDto"},{"dataType":"enum","enums":[null]}],"required":true},
            "certificateDirectory": {"dataType":"string","required":true},
            "endpointChangedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "validClientCertificates": {"dataType":"integer","required":true},
            "clientCertificatesToReEnroll": {"dataType":"integer","required":true},
            "version": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakEndpointChangeConfirmation": {
        "dataType": "refObject",
        "properties": {
            "notifyAffectedUsers": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateTakServerSettingsRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "enabled": {"dataType":"boolean","required":true},
            "hostName": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":253}}},
            "enrollmentPort": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1},"maximum":{"value":65535}}},
            "martiPort": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1},"maximum":{"value":65535}}},
            "streamingPort": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1},"maximum":{"value":65535}}},
            "clientCertificateDays": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1},"maximum":{"value":825}}},
            "unusedPackageHours": {"dataType":"integer","validators":{"minimum":{"value":1},"maximum":{"value":720}}},
            "endpointChange": {"ref":"TakEndpointChangeConfirmation"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AddTakServerCertificateRequest": {
        "dataType": "refObject",
        "properties": {
            "certificateChainPem": {"dataType":"string","required":true,"validators":{"maxLength":{"value":50000}}},
            "privateKeyPem": {"dataType":"string","required":true,"validators":{"maxLength":{"value":20000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UseTakCertificateFilesRequest": {
        "dataType": "refObject",
        "properties": {
            "certificateFile": {"dataType":"string","required":true,"validators":{"maxLength":{"value":500}}},
            "keyFile": {"dataType":"string","required":true,"validators":{"maxLength":{"value":500}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LiveTakConnectionDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "userId": {"ref":"Uuid","required":true},
            "userDisplayName": {"dataType":"string","required":true},
            "callsign": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "connectedAt": {"dataType":"string","required":true},
            "lastSeenAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LiveTakItemDto": {
        "dataType": "refObject",
        "properties": {
            "uid": {"dataType":"string","required":true},
            "type": {"dataType":"string","required":true},
            "callsign": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "lat": {"dataType":"double","required":true},
            "lon": {"dataType":"double","required":true},
            "course": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "speed": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "time": {"dataType":"string","required":true},
            "stale": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LiveTakTrafficDto": {
        "dataType": "refObject",
        "properties": {
            "connections": {"dataType":"array","array":{"dataType":"refObject","ref":"LiveTakConnectionDto"},"required":true},
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"LiveTakItemDto"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakEnrollmentDto": {
        "dataType": "refObject",
        "properties": {
            "username": {"dataType":"string","required":true},
            "expiresAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "hostName": {"dataType":"string","required":true},
            "enrollmentPort": {"dataType":"double","required":true},
            "martiPort": {"dataType":"double","required":true},
            "streamingPort": {"dataType":"double","required":true},
            "atakEnrollmentUrl": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "itakQrString": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "unusedPackageHours": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakReportedDeviceDto": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "app": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "appVersion": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "os": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "callsign": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakClientCertificateDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "userId": {"ref":"Uuid","required":true},
            "userDisplayName": {"dataType":"string","required":true},
            "clientUid": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "serialNumber": {"dataType":"string","required":true},
            "fingerprintSha256": {"dataType":"string","required":true},
            "status": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["valid"]},{"dataType":"enum","enums":["expired"]},{"dataType":"enum","enums":["revoked"]}],"required":true},
            "notBefore": {"dataType":"string","required":true},
            "notAfter": {"dataType":"string","required":true},
            "revokedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "revocationReason": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "firstConnectedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "lastConnectedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "device": {"dataType":"union","subSchemas":[{"ref":"TakReportedDeviceDto"},{"dataType":"enum","enums":[null]}],"required":true},
            "issuedForOldEndpoint": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RevokeTakCertificateRequest": {
        "dataType": "refObject",
        "properties": {
            "reason": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":200}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakCertificateAuthorityDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "origin": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["generated"]},{"dataType":"enum","enums":["imported"]}],"required":true},
            "active": {"dataType":"boolean","required":true},
            "subject": {"dataType":"string","required":true},
            "fingerprintSha256": {"dataType":"string","required":true},
            "notBefore": {"dataType":"string","required":true},
            "notAfter": {"dataType":"string","required":true},
            "certificatePem": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ImportTakCertificateAuthorityRequest": {
        "dataType": "refObject",
        "properties": {
            "certificatePem": {"dataType":"string","required":true,"validators":{"maxLength":{"value":20000}}},
            "privateKeyPem": {"dataType":"string","required":true,"validators":{"maxLength":{"value":20000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AcmeSolverDto": {
        "dataType": "refObject",
        "properties": {
            "challengeType": {"dataType":"string","required":true},
            "provider": {"dataType":"string","required":true},
            "label": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakAcmeSettingsDto": {
        "dataType": "refObject",
        "properties": {
            "enabled": {"dataType":"boolean","required":true},
            "email": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "challengeType": {"dataType":"string","required":true},
            "provider": {"dataType":"string","required":true},
            "cloudflareZoneId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "apiTokenSet": {"dataType":"boolean","required":true},
            "availableSolvers": {"dataType":"array","array":{"dataType":"refObject","ref":"AcmeSolverDto"},"required":true},
            "running": {"dataType":"boolean","required":true},
            "lastAttemptAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "lastSuccessAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "lastError": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "version": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateTakAcmeSettingsRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "enabled": {"dataType":"boolean","required":true},
            "email": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":254}}},
            "challengeType": {"dataType":"string","required":true,"validators":{"maxLength":{"value":30}}},
            "provider": {"dataType":"string","required":true,"validators":{"maxLength":{"value":50}}},
            "cloudflareZoneId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":64}}},
            "apiToken": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":500}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakAcmeTestResultDto": {
        "dataType": "refObject",
        "properties": {
            "succeeded": {"dataType":"boolean","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakGroupSummaryDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "eventId": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "receiverCount": {"dataType":"double","required":true},
            "senderCount": {"dataType":"double","required":true},
            "version": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakGroupPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"TakGroupSummaryDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakGroupMemberDto": {
        "dataType": "refObject",
        "properties": {
            "memberId": {"ref":"Uuid","required":true},
            "receive": {"dataType":"boolean","required":true},
            "send": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakGroupDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "eventId": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "receiverCount": {"dataType":"double","required":true},
            "senderCount": {"dataType":"double","required":true},
            "version": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
            "members": {"dataType":"array","array":{"dataType":"refObject","ref":"TakGroupMemberDto"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateTakGroupRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":60}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":500}}},
            "members": {"dataType":"array","array":{"dataType":"refObject","ref":"TakGroupMemberDto"},"validators":{"maxItems":{"value":5000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateTakGroupRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":60}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":500}}},
            "members": {"dataType":"array","array":{"dataType":"refObject","ref":"TakGroupMemberDto"},"validators":{"maxItems":{"value":5000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakGroupMode": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["off"]},{"dataType":"enum","enums":["simple"]},{"dataType":"enum","enums":["advanced"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakConfigurationDto": {
        "dataType": "refObject",
        "properties": {
            "eventId": {"ref":"Uuid","required":true},
            "meshChannelId": {"dataType":"union","subSchemas":[{"ref":"Uuid"},{"dataType":"enum","enums":[null]}],"required":true},
            "groupMode": {"ref":"TakGroupMode","required":true},
            "groupsInApp": {"dataType":"boolean","required":true},
            "version": {"dataType":"double","required":true},
            "updatedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateTakConfigurationRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "meshChannelId": {"dataType":"union","subSchemas":[{"ref":"Uuid"},{"dataType":"enum","enums":[null]}],"required":true},
            "groupMode": {"ref":"TakGroupMode"},
            "groupsInApp": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AtakPreferenceTargetDto": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["event"]},{"dataType":"enum","enums":["group"]},{"dataType":"enum","enums":["role"]},{"dataType":"enum","enums":["member"]}],"required":true},
            "id": {"dataType":"union","subSchemas":[{"ref":"Uuid"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AtakPreferenceTypeDto": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["string"]},{"dataType":"enum","enums":["boolean"]},{"dataType":"enum","enums":["integer"]},{"dataType":"enum","enums":["long"]},{"dataType":"enum","enums":["float"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AtakPreferenceEntryDto": {
        "dataType": "refObject",
        "properties": {
            "target": {"ref":"AtakPreferenceTargetDto","required":true},
            "preference": {"dataType":"string","required":true,"validators":{"maxLength":{"value":200}}},
            "key": {"dataType":"string","required":true,"validators":{"maxLength":{"value":200}}},
            "type": {"ref":"AtakPreferenceTypeDto","required":true},
            "value": {"dataType":"string","required":true,"validators":{"maxLength":{"value":10000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AtakPreferenceListDto": {
        "dataType": "refObject",
        "properties": {
            "eventId": {"ref":"Uuid","required":true},
            "entries": {"dataType":"array","array":{"dataType":"refObject","ref":"AtakPreferenceEntryDto"},"required":true},
            "version": {"dataType":"double","required":true},
            "updatedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReplaceAtakPreferencesRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "entries": {"dataType":"array","array":{"dataType":"refObject","ref":"AtakPreferenceEntryDto"},"required":true,"validators":{"maxItems":{"value":2000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SkippedAtakPreferenceDto": {
        "dataType": "refObject",
        "properties": {
            "key": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ImportAtakPreferencesResponse": {
        "dataType": "refObject",
        "properties": {
            "list": {"ref":"AtakPreferenceListDto","required":true},
            "importedCount": {"dataType":"double","required":true},
            "removedKeys": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "invalidKeys": {"dataType":"array","array":{"dataType":"refObject","ref":"SkippedAtakPreferenceDto"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ImportAtakPreferencesRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "fileName": {"dataType":"string","required":true,"validators":{"maxLength":{"value":200}}},
            "content": {"dataType":"string","required":true,"validators":{"maxLength":{"value":262144}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AtakCatalogValueDto": {
        "dataType": "refObject",
        "properties": {
            "value": {"dataType":"string","required":true},
            "label": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AtakCatalogKeyDto": {
        "dataType": "refObject",
        "properties": {
            "key": {"dataType":"string","required":true},
            "group": {"dataType":"string","required":true},
            "type": {"ref":"AtakPreferenceTypeDto","required":true},
            "defaultValue": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "values": {"dataType":"union","subSchemas":[{"dataType":"array","array":{"dataType":"refObject","ref":"AtakCatalogValueDto"}},{"dataType":"enum","enums":[null]}],"required":true},
            "numeric": {"dataType":"boolean","required":true},
            "description": {"dataType":"string","required":true},
            "use": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["form"]},{"dataType":"enum","enums":["member"]},{"dataType":"enum","enums":["warning"]},{"dataType":"enum","enums":["advanced"]},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AtakCatalogTopicDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "title": {"dataType":"string","required":true},
            "description": {"dataType":"string","required":true},
            "keys": {"dataType":"array","array":{"dataType":"refObject","ref":"AtakCatalogKeyDto"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AtakScreenItemDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "area": {"dataType":"string","required":true},
            "description": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AtakPreferenceCatalogDto": {
        "dataType": "refObject",
        "properties": {
            "atakVersion": {"dataType":"string","required":true},
            "topics": {"dataType":"array","array":{"dataType":"refObject","ref":"AtakCatalogTopicDto"},"required":true},
            "screenItems": {"dataType":"array","array":{"dataType":"refObject","ref":"AtakScreenItemDto"},"required":true},
            "blockedKeys": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"reason":{"dataType":"string","required":true},"key":{"dataType":"string","required":true}}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetupStatusResponse": {
        "dataType": "refObject",
        "properties": {
            "configured": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetupResponse": {
        "dataType": "refObject",
        "properties": {
            "user": {"dataType":"nestedObjectLiteral","nestedProperties":{"email":{"dataType":"string","required":true},"username":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetupRequest": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "username": {"dataType":"string","required":true,"validators":{"pattern":{"value":"^[a-z0-9._-]{3,32}$"}}},
            "password": {"dataType":"string","required":true,"validators":{"minLength":{"value":12},"maxLength":{"value":128}}},
            "token": {"dataType":"string","required":true,"validators":{"minLength":{"value":48},"maxLength":{"value":128}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresetKind": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["meshtastic"]},{"dataType":"enum","enums":["tak"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SettingsPresetSummaryDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "kind": {"ref":"PresetKind","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "targetVersion": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "itemCount": {"dataType":"double","required":true},
            "version": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SettingsPresetPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"SettingsPresetSummaryDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresetSourceDto": {
        "dataType": "refObject",
        "properties": {
            "application": {"dataType":"string","validators":{"maxLength":{"value":100}}},
            "applicationVersion": {"dataType":"string","validators":{"maxLength":{"value":40}}},
            "exportedFrom": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["event"]},{"dataType":"enum","enums":["library"]}]},
            "note": {"dataType":"string","validators":{"maxLength":{"value":1000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresetMeshtasticSettings": {
        "dataType": "refObject",
        "properties": {
        },
        "additionalProperties": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"double"},{"dataType":"boolean"}]},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MeshtasticPresetContentDto": {
        "dataType": "refObject",
        "properties": {
            "firmwareVersion": {"dataType":"string","required":true,"validators":{"maxLength":{"value":20}}},
            "settings": {"ref":"PresetMeshtasticSettings","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresetAtakTargetDto": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["event"]},{"dataType":"enum","enums":["group"]},{"dataType":"enum","enums":["role"]}],"required":true},
            "slug": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}],"validators":{"maxLength":{"value":100}}},
            "name": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}],"validators":{"maxLength":{"value":200}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresetAtakPreferenceDto": {
        "dataType": "refObject",
        "properties": {
            "target": {"ref":"PresetAtakTargetDto","required":true},
            "preference": {"dataType":"string","required":true,"validators":{"maxLength":{"value":200}}},
            "key": {"dataType":"string","required":true,"validators":{"maxLength":{"value":200}}},
            "type": {"ref":"AtakPreferenceTypeDto","required":true},
            "value": {"dataType":"string","required":true,"validators":{"maxLength":{"value":10000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakPresetContentDto": {
        "dataType": "refObject",
        "properties": {
            "atakVersion": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"undefined"}],"validators":{"maxLength":{"value":40}}},
            "atakPreferences": {"dataType":"array","array":{"dataType":"refObject","ref":"PresetAtakPreferenceDto"},"required":true,"validators":{"maxItems":{"value":2000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresetDocumentDto": {
        "dataType": "refObject",
        "properties": {
            "format": {"dataType":"string","required":true,"validators":{"maxLength":{"value":40}}},
            "formatVersion": {"dataType":"integer","required":true},
            "kind": {"ref":"PresetKind","required":true},
            "name": {"dataType":"string","required":true,"validators":{"maxLength":{"value":100}}},
            "description": {"dataType":"string","validators":{"maxLength":{"value":1000}}},
            "about": {"dataType":"string","validators":{"maxLength":{"value":4000}}},
            "exportedAt": {"dataType":"string"},
            "source": {"ref":"PresetSourceDto"},
            "meshtastic": {"ref":"MeshtasticPresetContentDto"},
            "tak": {"ref":"TakPresetContentDto"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SettingsPresetDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "kind": {"ref":"PresetKind","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "targetVersion": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "itemCount": {"dataType":"double","required":true},
            "version": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
            "document": {"ref":"PresetDocumentDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateSettingsPresetRequest": {
        "dataType": "refObject",
        "properties": {
            "document": {"ref":"PresetDocumentDto","required":true},
            "name": {"dataType":"string","validators":{"maxLength":{"value":100}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":1000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateSettingsPresetRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "name": {"dataType":"string","required":true,"validators":{"maxLength":{"value":100}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":1000}}},
            "document": {"ref":"PresetDocumentDto"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresetSettingChangeDto": {
        "dataType": "refObject",
        "properties": {
            "key": {"dataType":"string","required":true},
            "from": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"double"},{"dataType":"boolean"},{"dataType":"enum","enums":[null]}],"required":true},
            "to": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"double"},{"dataType":"boolean"}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresetSettingProblemDto": {
        "dataType": "refObject",
        "properties": {
            "key": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MeshtasticPresetPreviewDto": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"double","required":true},
            "presetFirmwareVersion": {"dataType":"string","required":true},
            "eventFirmwareVersion": {"dataType":"string","required":true},
            "sameFirmwareLine": {"dataType":"boolean","required":true},
            "changed": {"dataType":"array","array":{"dataType":"refObject","ref":"PresetSettingChangeDto"},"required":true},
            "unchanged": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "invalid": {"dataType":"array","array":{"dataType":"refObject","ref":"PresetSettingProblemDto"},"required":true},
            "unsupported": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "notInPreset": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "secretsKept": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "confirmation": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PreviewMeshtasticPresetRequest": {
        "dataType": "refObject",
        "properties": {
            "document": {"ref":"PresetDocumentDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FirmwareSettingsDocument": {
        "dataType": "refObject",
        "properties": {
        },
        "additionalProperties": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"double"},{"dataType":"boolean"}]},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConfigurationProblemDto": {
        "dataType": "refObject",
        "properties": {
            "field": {"dataType":"string","required":true},
            "code": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MeshtasticConfigurationDto": {
        "dataType": "refObject",
        "properties": {
            "eventId": {"ref":"Uuid","required":true},
            "firmwareVersion": {"dataType":"string","required":true},
            "effectiveMinimumVersion": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "profileId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "verified": {"dataType":"boolean","required":true},
            "settings": {"ref":"FirmwareSettingsDocument","required":true},
            "secretFields": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "secretsSet": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "problems": {"dataType":"array","array":{"dataType":"refObject","ref":"ConfigurationProblemDto"},"required":true},
            "version": {"dataType":"double","required":true},
            "updatedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApplyMeshtasticPresetRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "document": {"ref":"PresetDocumentDto","required":true},
            "confirmation": {"dataType":"string","required":true,"validators":{"maxLength":{"value":100}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresetTargetDto": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["group"]},{"dataType":"enum","enums":["role"]}],"required":true},
            "slug": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "entryCount": {"dataType":"double","required":true},
            "suggestedTargetId": {"dataType":"union","subSchemas":[{"ref":"Uuid"},{"dataType":"enum","enums":[null]}],"required":true},
            "mapping": {"dataType":"nestedObjectLiteral","nestedProperties":{"targetId":{"dataType":"union","subSchemas":[{"ref":"Uuid"},{"dataType":"enum","enums":[null]}],"required":true}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresetEntryChangeDto": {
        "dataType": "refObject",
        "properties": {
            "target": {"ref":"AtakPreferenceTargetDto","required":true},
            "preference": {"dataType":"string","required":true},
            "key": {"dataType":"string","required":true},
            "type": {"ref":"AtakPreferenceTypeDto","required":true},
            "from": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "to": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresetEntryProblemDto": {
        "dataType": "refObject",
        "properties": {
            "target": {"ref":"PresetAtakTargetDto","required":true},
            "key": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakPresetPreviewDto": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"double","required":true},
            "presetAtakVersion": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "catalogAtakVersion": {"dataType":"string","required":true},
            "targets": {"dataType":"array","array":{"dataType":"refObject","ref":"PresetTargetDto"},"required":true},
            "added": {"dataType":"array","array":{"dataType":"refObject","ref":"PresetEntryChangeDto"},"required":true},
            "changed": {"dataType":"array","array":{"dataType":"refObject","ref":"PresetEntryChangeDto"},"required":true},
            "unchanged": {"dataType":"double","required":true},
            "invalid": {"dataType":"array","array":{"dataType":"refObject","ref":"PresetEntryProblemDto"},"required":true},
            "skipped": {"dataType":"double","required":true},
            "confirmation": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresetTargetMappingDto": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["group"]},{"dataType":"enum","enums":["role"]}],"required":true},
            "slug": {"dataType":"string","required":true,"validators":{"maxLength":{"value":100}}},
            "targetId": {"dataType":"union","subSchemas":[{"ref":"Uuid"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PreviewTakPresetRequest": {
        "dataType": "refObject",
        "properties": {
            "document": {"ref":"PresetDocumentDto","required":true},
            "mappings": {"dataType":"array","array":{"dataType":"refObject","ref":"PresetTargetMappingDto"},"validators":{"maxItems":{"value":500}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApplyTakPresetRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "document": {"ref":"PresetDocumentDto","required":true},
            "mappings": {"dataType":"array","array":{"dataType":"refObject","ref":"PresetTargetMappingDto"},"required":true,"validators":{"maxItems":{"value":500}}},
            "confirmation": {"dataType":"string","required":true,"validators":{"maxLength":{"value":100}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ServerLogLevel": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["trace"]},{"dataType":"enum","enums":["debug"]},{"dataType":"enum","enums":["info"]},{"dataType":"enum","enums":["warn"]},{"dataType":"enum","enums":["error"]},{"dataType":"enum","enums":["fatal"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ServerLogEntryDto": {
        "dataType": "refObject",
        "properties": {
            "sequence": {"dataType":"double","required":true},
            "time": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "level": {"ref":"ServerLogLevel","required":true},
            "message": {"dataType":"string","required":true},
            "details": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ServerLogPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"ServerLogEntryDto"},"required":true},
            "latestSequence": {"dataType":"double","required":true},
            "reset": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RegistrationMode": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["closed"]},{"dataType":"enum","enums":["invite"]},{"dataType":"enum","enums":["open"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RegistrationStatusDto": {
        "dataType": "refObject",
        "properties": {
            "mode": {"ref":"RegistrationMode","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RegisterResponse": {
        "dataType": "refObject",
        "properties": {
            "user": {"dataType":"nestedObjectLiteral","nestedProperties":{"username":{"dataType":"string","required":true},"displayName":{"dataType":"string","required":true},"id":{"ref":"Uuid","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RegisterRequest": {
        "dataType": "refObject",
        "properties": {
            "displayName": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "username": {"dataType":"string","required":true,"validators":{"pattern":{"value":"^[a-z0-9._-]{3,32}$"}}},
            "password": {"dataType":"string","required":true,"validators":{"minLength":{"value":12},"maxLength":{"value":128}}},
            "inviteToken": {"dataType":"string","validators":{"maxLength":{"value":200}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RegistrationSettingsDto": {
        "dataType": "refObject",
        "properties": {
            "mode": {"ref":"RegistrationMode","required":true},
            "version": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateRegistrationSettingsRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "mode": {"ref":"RegistrationMode","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AccountInviteStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["open"]},{"dataType":"enum","enums":["consumed"]},{"dataType":"enum","enums":["revoked"]},{"dataType":"enum","enums":["expired"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RegistrationInviteDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "status": {"ref":"AccountInviteStatus","required":true},
            "expiresAt": {"dataType":"string","required":true},
            "consumedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "revokedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "createdAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatedRegistrationInviteResponse": {
        "dataType": "refObject",
        "properties": {
            "invite": {"ref":"RegistrationInviteDto","required":true},
            "inviteUrl": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProfileAssignment": {
        "dataType": "refObject",
        "properties": {
            "slug": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
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
    "ProfileTakServer": {
        "dataType": "refObject",
        "properties": {
            "hostName": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "streamingPort": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProfileMeshtasticTakServer": {
        "dataType": "refObject",
        "properties": {
            "meshChannel": {"dataType":"union","subSchemas":[{"dataType":"nestedObjectLiteral","nestedProperties":{"slot":{"dataType":"double","required":true},"name":{"dataType":"string","required":true}}},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProfileChannel": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "primary": {"dataType":"boolean","required":true},
            "uplinkEnabled": {"dataType":"boolean","required":true},
            "downlinkEnabled": {"dataType":"boolean","required":true},
            "positionPrecision": {"dataType":"double","required":true},
            "delivery": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["included"]},{"dataType":"enum","enums":["on-site"]}],"required":true},
            "keyHolder": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProfileFirmware": {
        "dataType": "refObject",
        "properties": {
            "recommendedVersion": {"dataType":"string","required":true},
            "line": {"dataType":"string","required":true},
            "minimumVersion": {"dataType":"string","required":true},
            "channel": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["stable"]},{"dataType":"enum","enums":["beta"]},{"dataType":"enum","enums":["alpha"]}],"required":true},
            "verified": {"dataType":"boolean","required":true},
            "flasherUrl": {"dataType":"string","required":true},
            "flashingNotes": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResolvedProfileDto": {
        "dataType": "refObject",
        "properties": {
            "eventId": {"ref":"Uuid","required":true},
            "memberId": {"ref":"Uuid","required":true},
            "userId": {"ref":"Uuid","required":true},
            "source": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["published"]},{"dataType":"enum","enums":["preview"]}],"required":true},
            "configurationRevision": {"dataType":"union","subSchemas":[{"dataType":"nestedObjectLiteral","nestedProperties":{"number":{"dataType":"double","required":true},"id":{"ref":"Uuid","required":true}}},{"dataType":"enum","enums":[null]}],"required":true},
            "username": {"dataType":"string","required":true},
            "callsign": {"dataType":"string","required":true},
            "eventRole": {"ref":"ProfileAssignment","required":true},
            "group": {"ref":"ProfileAssignment","required":true},
            "tak": {"dataType":"nestedObjectLiteral","nestedProperties":{"meshtasticLocalServer":{"dataType":"union","subSchemas":[{"ref":"ProfileMeshtasticTakServer"},{"dataType":"enum","enums":[null]}],"required":true},"server":{"ref":"ProfileTakServer","required":true},"serverGroups":{"dataType":"array","array":{"dataType":"string"},"required":true},"role":{"ref":"TakRole","required":true},"team":{"ref":"TakTeam","required":true},"callsign":{"dataType":"string","required":true}},"required":true},
            "meshtastic": {"dataType":"union","subSchemas":[{"dataType":"nestedObjectLiteral","nestedProperties":{"firmware":{"dataType":"union","subSchemas":[{"ref":"ProfileFirmware"},{"dataType":"enum","enums":[null]}],"required":true},"channels":{"dataType":"array","array":{"dataType":"refObject","ref":"ProfileChannel"},"required":true},"shortName":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"longName":{"dataType":"string","required":true}}},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MyEventMembershipDto": {
        "dataType": "refObject",
        "properties": {
            "eventId": {"ref":"Uuid","required":true},
            "eventName": {"dataType":"string","required":true},
            "eventSlug": {"dataType":"string","required":true},
            "timeZone": {"dataType":"string","required":true},
            "memberId": {"ref":"Uuid","required":true},
            "callsign": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChannelHandoutDto": {
        "dataType": "refObject",
        "properties": {
            "channelId": {"ref":"Uuid","required":true},
            "channelName": {"dataType":"string","required":true},
            "primary": {"dataType":"boolean","required":true},
            "pskVersion": {"dataType":"double","required":true},
            "url": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PrincipalDto": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["user"]},{"dataType":"enum","enums":["api-client"]}],"required":true},
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "username": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "hasPassword": {"dataType":"boolean","required":true},
            "permissions": {"dataType":"array","array":{"dataType":"refObject","ref":"PermissionGrantDto"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DataPackageKind": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["package"]},{"dataType":"enum","enums":["mission"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageSnapshotLayer": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "sortOrder": {"dataType":"double","required":true},
            "visible": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageObjectKind": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["point"]},{"dataType":"enum","enums":["line"]},{"dataType":"enum","enums":["polygon"]},{"dataType":"enum","enums":["circle"]},{"dataType":"enum","enums":["rectangle"]},{"dataType":"enum","enums":["ellipse"]},{"dataType":"enum","enums":["route"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Position": {
        "dataType": "refAlias",
        "type": {"dataType":"array","array":{"dataType":"double"},"validators":{"minItems":{"value":2},"maxItems":{"value":3}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PointGeometry": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"enum","enums":["Point"],"required":true},
            "coordinates": {"ref":"Position","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LineStringGeometry": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"enum","enums":["LineString"],"required":true},
            "coordinates": {"dataType":"array","array":{"dataType":"refAlias","ref":"Position"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PolygonGeometry": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"enum","enums":["Polygon"],"required":true},
            "coordinates": {"dataType":"array","array":{"dataType":"array","array":{"dataType":"refAlias","ref":"Position"}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CircleGeometry": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"enum","enums":["Circle"],"required":true},
            "coordinates": {"ref":"Position","required":true},
            "radius": {"dataType":"double","required":true,"validators":{"minimum":{"value":0.1},"maximum":{"value":100000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RectangleGeometry": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"enum","enums":["Rectangle"],"required":true},
            "coordinates": {"dataType":"array","array":{"dataType":"refAlias","ref":"Position"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EllipseGeometry": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"enum","enums":["Ellipse"],"required":true},
            "coordinates": {"ref":"Position","required":true},
            "major": {"dataType":"double","required":true,"validators":{"minimum":{"value":0.1},"maximum":{"value":100000}}},
            "minor": {"dataType":"double","required":true,"validators":{"minimum":{"value":0.1},"maximum":{"value":100000}}},
            "rotation": {"dataType":"double","required":true,"validators":{"minimum":{"value":0},"maximum":{"value":360}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RoutePointId": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{"minLength":{"value":1},"maxLength":{"value":128},"pattern":{"value":"^[^\\u0000-\\u001f]+$"}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RoutePoint": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"RoutePointId","required":true},
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["waypoint"]},{"dataType":"enum","enums":["checkpoint"]}],"required":true},
            "name": {"dataType":"string","required":true,"validators":{"maxLength":{"value":100}}},
            "remarks": {"dataType":"string","required":true,"validators":{"maxLength":{"value":2000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RouteOption": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{"maxLength":{"value":64}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RouteOptions": {
        "dataType": "refObject",
        "properties": {
            "transportationType": {"ref":"RouteOption"},
            "method": {"ref":"RouteOption"},
            "direction": {"ref":"RouteOption"},
            "routeType": {"ref":"RouteOption"},
            "order": {"ref":"RouteOption"},
            "planningMethod": {"ref":"RouteOption"},
            "prefix": {"ref":"RouteOption"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RouteCueTrigger": {
        "dataType": "refObject",
        "properties": {
            "mode": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["d"]},{"dataType":"enum","enums":["t"]}],"required":true},
            "value": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0},"maximum":{"value":2147483647}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RouteNavigationCue": {
        "dataType": "refObject",
        "properties": {
            "pointId": {"ref":"RoutePointId","required":true},
            "text": {"dataType":"string","required":true,"validators":{"maxLength":{"value":2000}}},
            "voice": {"dataType":"string","required":true,"validators":{"maxLength":{"value":2000}}},
            "triggers": {"dataType":"array","array":{"dataType":"refObject","ref":"RouteCueTrigger"},"required":true,"validators":{"maxItems":{"value":16}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RouteGeometry": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"enum","enums":["Route"],"required":true},
            "coordinates": {"dataType":"array","array":{"dataType":"refAlias","ref":"Position"},"required":true},
            "points": {"dataType":"array","array":{"dataType":"refObject","ref":"RoutePoint"},"required":true,"validators":{"maxItems":{"value":10000}}},
            "options": {"ref":"RouteOptions","required":true},
            "navigationCues": {"dataType":"array","array":{"dataType":"refObject","ref":"RouteNavigationCue"},"required":true,"validators":{"maxItems":{"value":1000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageGeometry": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"PointGeometry"},{"ref":"LineStringGeometry"},{"ref":"PolygonGeometry"},{"ref":"CircleGeometry"},{"ref":"RectangleGeometry"},{"ref":"EllipseGeometry"},{"ref":"RouteGeometry"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "HexColor": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{"pattern":{"value":"^#[0-9A-Fa-f]{6}$"}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StrokeStyle": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["solid"]},{"dataType":"enum","enums":["dashed"]},{"dataType":"enum","enums":["dotted"]},{"dataType":"enum","enums":["outlined"]},{"dataType":"enum","enums":["custom"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "HeightUnit": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":[0]},{"dataType":"enum","enums":[1]},{"dataType":"enum","enums":[2]},{"dataType":"enum","enums":[3]},{"dataType":"enum","enums":[4]},{"dataType":"enum","enums":[5]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ExtrudeMode": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["cylinder"]},{"dataType":"enum","enums":["cone_down"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ArrowHeads": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["none"]},{"dataType":"enum","enums":["start"]},{"dataType":"enum","enums":["end"]},{"dataType":"enum","enums":["both"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DistanceUnit": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["m"]},{"dataType":"enum","enums":["km"]},{"dataType":"enum","enums":["ft"]},{"dataType":"enum","enums":["mi"]},{"dataType":"enum","enums":["nm"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SectorStyle": {
        "dataType": "refObject",
        "properties": {
            "heading": {"dataType":"double","required":true,"validators":{"minimum":{"value":0},"maximum":{"value":360}}},
            "sweep": {"dataType":"double","required":true,"validators":{"minimum":{"value":1},"maximum":{"value":360}}},
            "radius": {"dataType":"double","required":true,"validators":{"minimum":{"value":0.1},"maximum":{"value":100000}}},
            "rangeLines": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"validators":{"minimum":{"value":1},"maximum":{"value":60000}}},
            "displayLabels": {"dataType":"boolean"},
            "visible": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BullseyeStyle": {
        "dataType": "refObject",
        "properties": {
            "ringDistance": {"dataType":"double","required":true,"validators":{"minimum":{"value":0.1},"maximum":{"value":100000}}},
            "ringCount": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1},"maximum":{"value":10}}},
            "ringsVisible": {"dataType":"boolean","required":true},
            "edgeToCenter": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string.string_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"dataType":"string"},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TacticalGraphicStyle": {
        "dataType": "refObject",
        "properties": {
            "sidc": {"dataType":"string","required":true,"validators":{"pattern":{"value":"^11[0-9]{18}$"}}},
            "modifiers": {"ref":"Record_string.string_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageObjectStyle": {
        "dataType": "refObject",
        "properties": {
            "color": {"ref":"HexColor","required":true},
            "strokeWidth": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1},"maximum":{"value":20}}},
            "fillOpacity": {"dataType":"double","required":true,"validators":{"minimum":{"value":0},"maximum":{"value":1}}},
            "strokeStyle": {"ref":"StrokeStyle"},
            "fillColor": {"dataType":"union","subSchemas":[{"ref":"HexColor"},{"dataType":"enum","enums":[null]}]},
            "height": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"validators":{"minimum":{"value":-100000},"maximum":{"value":100000}}},
            "heightUnit": {"dataType":"union","subSchemas":[{"ref":"HeightUnit"},{"dataType":"enum","enums":[null]}]},
            "extrudeMode": {"dataType":"union","subSchemas":[{"ref":"ExtrudeMode"},{"dataType":"enum","enums":[null]}]},
            "arrowHeads": {"ref":"ArrowHeads"},
            "arrowHeadSize": {"dataType":"integer","validators":{"minimum":{"value":6},"maximum":{"value":64}}},
            "routeDirectionArrows": {"dataType":"boolean"},
            "routeArrowSpacing": {"dataType":"integer","validators":{"minimum":{"value":24},"maximum":{"value":256}}},
            "rangeBearing": {"dataType":"boolean"},
            "distanceUnit": {"ref":"DistanceUnit"},
            "sector": {"dataType":"union","subSchemas":[{"ref":"SectorStyle"},{"dataType":"enum","enums":[null]}]},
            "corridorWidth": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"validators":{"minimum":{"value":1},"maximum":{"value":10000}}},
            "dashPattern": {"dataType":"union","subSchemas":[{"dataType":"array","array":{"dataType":"double"}},{"dataType":"enum","enums":[null]}],"validators":{"minItems":{"value":2},"maxItems":{"value":8}}},
            "labelVisible": {"dataType":"boolean"},
            "rangeCircle": {"dataType":"boolean"},
            "rangeRings": {"dataType":"integer","validators":{"minimum":{"value":1},"maximum":{"value":10}}},
            "bullseye": {"dataType":"union","subSchemas":[{"ref":"BullseyeStyle"},{"dataType":"enum","enums":[null]}]},
            "bearingUnit": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["degrees"]},{"dataType":"enum","enums":["mils"]},{"dataType":"enum","enums":["radians"]},{"dataType":"enum","enums":["warsaw-mils"]},{"dataType":"enum","enums":["streck"]},{"dataType":"enum","enums":["clock"]}]},
            "minimumSafeDistance": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"validators":{"minimum":{"value":0.1},"maximum":{"value":5000}}},
            "msdColor": {"dataType":"union","subSchemas":[{"ref":"HexColor"},{"dataType":"enum","enums":[null]}]},
            "tacticalGraphic": {"dataType":"union","subSchemas":[{"ref":"TacticalGraphicStyle"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CotType": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{"pattern":{"value":"^[a-z](-[A-Za-z0-9]+){1,15}$"},"maxLength":{"value":64}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TakMarker": {
        "dataType": "refObject",
        "properties": {
            "cotType": {"ref":"CotType","required":true},
            "iconsetPath": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"pattern":{"value":"^[^\\u0000-\\u001f<>\"]+$"},"maxLength":{"value":256}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageSnapshotObject": {
        "dataType": "refObject",
        "properties": {
            "supplementParent": {"dataType":"string"},
            "id": {"dataType":"string","required":true},
            "layerId": {"dataType":"string","required":true},
            "kind": {"ref":"PackageObjectKind","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "geometry": {"ref":"PackageGeometry","required":true},
            "style": {"ref":"PackageObjectStyle","required":true},
            "tak": {"dataType":"union","subSchemas":[{"ref":"TakMarker"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OfflineTileContentDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "layerId": {"ref":"Uuid","required":true},
            "kind": {"dataType":"enum","enums":["tiles"],"required":true},
            "name": {"dataType":"string","required":true},
            "minZoom": {"dataType":"double","required":true},
            "maxZoom": {"dataType":"double","required":true},
            "bounds": {"dataType":"array","array":{"dataType":"double"},"required":true},
            "tiles": {"dataType":"double","required":true},
            "size": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OfflineImageContentDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "layerId": {"ref":"Uuid","required":true},
            "kind": {"dataType":"enum","enums":["image"],"required":true},
            "name": {"dataType":"string","required":true},
            "corners": {"dataType":"array","array":{"dataType":"array","array":{"dataType":"double"}},"required":true},
            "mediaType": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["image/png"]},{"dataType":"enum","enums":["image/jpeg"]}],"required":true},
            "sha256": {"dataType":"string","required":true},
            "size": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OfflineContentDto": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"OfflineTileContentDto"},{"ref":"OfflineImageContentDto"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OfflineSkippedContentDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "kind": {"dataType":"string","required":true},
            "reason": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["not-displayable"]},{"dataType":"enum","enums":["unreadable"]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OfflineSnapshotPackageDto": {
        "dataType": "refObject",
        "properties": {
            "packageId": {"ref":"Uuid","required":true},
            "kind": {"ref":"DataPackageKind","required":true},
            "name": {"dataType":"string","required":true},
            "revision": {"dataType":"double","required":true},
            "revisionId": {"ref":"Uuid","required":true},
            "snapshotHash": {"dataType":"string","required":true},
            "publishedAt": {"dataType":"string","required":true},
            "layers": {"dataType":"array","array":{"dataType":"refObject","ref":"PackageSnapshotLayer"},"required":true},
            "objects": {"dataType":"array","array":{"dataType":"refObject","ref":"PackageSnapshotObject"},"required":true},
            "contents": {"dataType":"array","array":{"dataType":"refAlias","ref":"OfflineContentDto"},"required":true},
            "skippedContents": {"dataType":"array","array":{"dataType":"refObject","ref":"OfflineSkippedContentDto"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OfflineSnapshotDto": {
        "dataType": "refObject",
        "properties": {
            "format": {"dataType":"double","required":true},
            "event": {"dataType":"nestedObjectLiteral","nestedProperties":{"timeZone":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"ref":"Uuid","required":true}},"required":true},
            "preparedAt": {"dataType":"string","required":true},
            "packages": {"dataType":"array","array":{"dataType":"refObject","ref":"OfflineSnapshotPackageDto"},"required":true},
            "skippedPackages": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"reason":{"dataType":"enum","enums":["not-published"],"required":true},"name":{"dataType":"string","required":true},"packageId":{"ref":"Uuid","required":true}}},"required":true},
            "estimatedBytes": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OfflineSnapshotSelection": {
        "dataType": "refObject",
        "properties": {
            "packageId": {"ref":"Uuid","required":true},
            "revision": {"dataType":"integer","validators":{"minimum":{"value":1}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateOfflineSnapshotRequest": {
        "dataType": "refObject",
        "properties": {
            "packages": {"dataType":"array","array":{"dataType":"refObject","ref":"OfflineSnapshotSelection"},"required":true,"validators":{"minItems":{"value":1},"maxItems":{"value":50}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OfflineTileDto": {
        "dataType": "refObject",
        "properties": {
            "z": {"dataType":"double","required":true},
            "x": {"dataType":"double","required":true},
            "y": {"dataType":"double","required":true},
            "mediaType": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["image/png"]},{"dataType":"enum","enums":["image/jpeg"]}],"required":true},
            "data": {"dataType":"string","required":true},
            "sha256": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OfflineTilePage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"OfflineTileDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FirmwareReleaseDto": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"string","required":true},
            "build": {"dataType":"string","required":true},
            "channel": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["stable"]},{"dataType":"enum","enums":["beta"]},{"dataType":"enum","enums":["alpha"]}],"required":true},
            "support": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["tested"]},{"dataType":"enum","enums":["supported"]},{"dataType":"enum","enums":["unsupported"]}],"required":true},
            "profileId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "releaseUrl": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FirmwareReleaseListDto": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["current"]},{"dataType":"enum","enums":["cached"]},{"dataType":"enum","enums":["unknown"]},{"dataType":"enum","enums":["disabled"]}],"required":true},
            "fetchedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "releases": {"dataType":"array","array":{"dataType":"refObject","ref":"FirmwareReleaseDto"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FirmwareReleaseSettingsDto": {
        "dataType": "refObject",
        "properties": {
            "checkEnabled": {"dataType":"boolean","required":true},
            "version": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateFirmwareReleaseSettingsRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "checkEnabled": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FirmwareProfileSummaryDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "line": {"dataType":"string","required":true},
            "minVersion": {"dataType":"string","required":true},
            "testedVersions": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "channel": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["stable"]},{"dataType":"enum","enums":["beta"]},{"dataType":"enum","enums":["alpha"]}],"required":true},
            "default": {"dataType":"boolean","required":true},
            "flasherUrl": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FirmwareSectionDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "label": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FirmwareFieldDto": {
        "dataType": "refObject",
        "properties": {
            "key": {"dataType":"string","required":true},
            "section": {"dataType":"string","required":true},
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["string"]},{"dataType":"enum","enums":["integer"]},{"dataType":"enum","enums":["number"]},{"dataType":"enum","enums":["boolean"]},{"dataType":"enum","enums":["enum"]},{"dataType":"enum","enums":["bytes"]}],"required":true},
            "label": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
            "unit": {"dataType":"string"},
            "since": {"dataType":"string","required":true},
            "managed": {"dataType":"boolean","required":true},
            "secret": {"dataType":"boolean","required":true},
            "maxBytes": {"dataType":"double"},
            "min": {"dataType":"double"},
            "max": {"dataType":"double"},
            "enum": {"dataType":"string"},
            "default": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"double"},{"dataType":"boolean"}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FirmwareEnumValueDto": {
        "dataType": "refObject",
        "properties": {
            "value": {"dataType":"string","required":true},
            "label": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string.FirmwareEnumValueDto-Array_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"dataType":"array","array":{"dataType":"refObject","ref":"FirmwareEnumValueDto"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FirmwareProfileDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "line": {"dataType":"string","required":true},
            "minVersion": {"dataType":"string","required":true},
            "testedVersions": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "channel": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["stable"]},{"dataType":"enum","enums":["beta"]},{"dataType":"enum","enums":["alpha"]}],"required":true},
            "default": {"dataType":"boolean","required":true},
            "flasherUrl": {"dataType":"string","required":true},
            "flashingNotes": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "sha256": {"dataType":"string","required":true},
            "sections": {"dataType":"array","array":{"dataType":"refObject","ref":"FirmwareSectionDto"},"required":true},
            "fields": {"dataType":"array","array":{"dataType":"refObject","ref":"FirmwareFieldDto"},"required":true},
            "enums": {"ref":"Record_string.FirmwareEnumValueDto-Array_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateMeshtasticSettingsRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "settings": {"ref":"FirmwareSettingsDocument","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SecretSettingsChanges": {
        "dataType": "refObject",
        "properties": {
        },
        "additionalProperties": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"double"},{"dataType":"enum","enums":[null]}]},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateMeshtasticSecretsRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "secrets": {"ref":"SecretSettingsChanges","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FirmwareChangeReportDto": {
        "dataType": "refObject",
        "properties": {
            "kept": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "dropped": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "invalid": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "added": {"dataType":"array","array":{"dataType":"string"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FirmwareChangePreviewDto": {
        "dataType": "refObject",
        "properties": {
            "firmwareVersion": {"dataType":"string","required":true},
            "effectiveMinimumVersion": {"dataType":"string","required":true},
            "profileId": {"dataType":"string","required":true},
            "report": {"ref":"FirmwareChangeReportDto","required":true},
            "confirmation": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PreviewFirmwareChangeRequest": {
        "dataType": "refObject",
        "properties": {
            "firmwareVersion": {"dataType":"string","required":true,"validators":{"maxLength":{"value":20}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChangeFirmwareRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "firmwareVersion": {"dataType":"string","required":true,"validators":{"maxLength":{"value":20}}},
            "confirmation": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChannelPskKind": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["none"]},{"dataType":"enum","enums":["default"]},{"dataType":"enum","enums":["aes128"]},{"dataType":"enum","enums":["aes256"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChannelPskInfo": {
        "dataType": "refObject",
        "properties": {
            "kind": {"ref":"ChannelPskKind","required":true},
            "version": {"dataType":"double","required":true},
            "rotatedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventAudience": {
        "dataType": "refObject",
        "properties": {
            "groupIds": {"dataType":"array","array":{"dataType":"refAlias","ref":"Uuid"},"required":true,"validators":{"maxItems":{"value":100}}},
            "roleIds": {"dataType":"array","array":{"dataType":"refAlias","ref":"Uuid"},"required":true,"validators":{"maxItems":{"value":100}}},
            "memberIds": {"dataType":"array","array":{"dataType":"refAlias","ref":"Uuid"},"required":true,"validators":{"maxItems":{"value":500}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MeshtasticChannelDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "eventId": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "sortOrder": {"dataType":"double","required":true},
            "primary": {"dataType":"boolean","required":true},
            "psk": {"ref":"ChannelPskInfo","required":true},
            "uplinkEnabled": {"dataType":"boolean","required":true},
            "downlinkEnabled": {"dataType":"boolean","required":true},
            "positionPrecision": {"dataType":"double","required":true},
            "audience": {"ref":"EventAudience","required":true},
            "secret": {"dataType":"boolean","required":true},
            "releasedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "keyHolders": {"ref":"EventAudience","required":true},
            "version": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MeshtasticChannelPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"MeshtasticChannelDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MeshtasticChannelName": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{"pattern":{"value":"^[A-Za-z0-9_-]{1,11}$"}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChannelSortOrder": {
        "dataType": "refAlias",
        "type": {"dataType":"integer","validators":{"minimum":{"value":0},"maximum":{"value":1000}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PositionPrecision": {
        "dataType": "refAlias",
        "type": {"dataType":"integer","validators":{"minimum":{"value":0},"maximum":{"value":32}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateMeshtasticChannelRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"ref":"MeshtasticChannelName","required":true},
            "sortOrder": {"ref":"ChannelSortOrder"},
            "psk": {"dataType":"string","validators":{"maxLength":{"value":64}}},
            "uplinkEnabled": {"dataType":"boolean"},
            "downlinkEnabled": {"dataType":"boolean"},
            "positionPrecision": {"ref":"PositionPrecision"},
            "audience": {"ref":"EventAudience"},
            "secret": {"dataType":"boolean"},
            "keyHolders": {"ref":"EventAudience"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateMeshtasticChannelRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "name": {"ref":"MeshtasticChannelName","required":true},
            "sortOrder": {"ref":"ChannelSortOrder","required":true},
            "uplinkEnabled": {"dataType":"boolean","required":true},
            "downlinkEnabled": {"dataType":"boolean","required":true},
            "positionPrecision": {"ref":"PositionPrecision","required":true},
            "audience": {"ref":"EventAudience","required":true},
            "secret": {"dataType":"boolean","required":true},
            "keyHolders": {"ref":"EventAudience","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RotateChannelPskRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "psk": {"dataType":"string","validators":{"maxLength":{"value":64}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReleaseMeshtasticChannelRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RevealedChannelPsk": {
        "dataType": "refObject",
        "properties": {
            "kind": {"ref":"ChannelPskKind","required":true},
            "version": {"dataType":"double","required":true},
            "psk": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MemberDataPackageDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "revision": {"dataType":"double","required":true},
            "publishedAt": {"dataType":"string","required":true},
            "installOnEnrollment": {"dataType":"boolean","required":true},
            "installOnConnection": {"dataType":"boolean","required":true},
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
    "BaseMapLayerDto": {
        "dataType": "refObject",
        "properties": {
            "providerName": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "tileUrlTemplate": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":500}}},
            "attribution": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":300}}},
            "maxZoom": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1},"maximum":{"value":22}}},
            "id": {"ref":"Uuid","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MapSettingsDto": {
        "dataType": "refObject",
        "properties": {
            "providerName": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "tileUrlTemplate": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":500}}},
            "attribution": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":300}}},
            "maxZoom": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1},"maximum":{"value":22}}},
            "version": {"dataType":"double","required":true},
            "layers": {"dataType":"array","array":{"dataType":"refObject","ref":"BaseMapLayerDto"},"required":true},
            "defaultLayerId": {"ref":"Uuid","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateMapSettingsRequest": {
        "dataType": "refObject",
        "properties": {
            "providerName": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "tileUrlTemplate": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":500}}},
            "attribution": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":300}}},
            "maxZoom": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1},"maximum":{"value":22}}},
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "layers": {"dataType":"array","array":{"dataType":"refObject","ref":"BaseMapLayerDto"},"validators":{"minItems":{"value":1},"maxItems":{"value":10}}},
            "defaultLayerId": {"ref":"Uuid"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InstanceSettingsDto": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "version": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateInstanceSettingsRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":60}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IconSettingsDto": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"double","required":true},
            "icons": {"dataType":"double","required":true},
            "sets": {"dataType":"double","required":true},
            "groups": {"dataType":"double","required":true},
            "updatedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ImportReportEntry": {
        "dataType": "refObject",
        "properties": {
            "feature": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateIconSettingsResult": {
        "dataType": "refObject",
        "properties": {
            "settings": {"ref":"IconSettingsDto","required":true},
            "accepted": {"dataType":"double","required":true},
            "rejected": {"dataType":"array","array":{"dataType":"refObject","ref":"ImportReportEntry"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageIconDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "path": {"dataType":"string","required":true},
            "setName": {"dataType":"string","required":true},
            "group": {"dataType":"string","required":true},
            "filename": {"dataType":"string","required":true},
            "cotType": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "width": {"dataType":"double","required":true},
            "height": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InstanceIconCatalogue": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"double","required":true},
            "icons": {"dataType":"array","array":{"dataType":"refObject","ref":"PackageIconDto"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "HealthResponse": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["ok"],"required":true},
            "service": {"dataType":"enum","enums":["openmeshtak"],"required":true},
            "version": {"dataType":"string","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventOverview": {
        "dataType": "refObject",
        "properties": {
            "memberCount": {"dataType":"double","required":true},
            "openSyncIssueCount": {"dataType":"double","required":true},
            "publishedRevision": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "unpublishedChanges": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["draft"]},{"dataType":"enum","enums":["active"]},{"dataType":"enum","enums":["archived"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventListItemDto": {
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
            "takLoginTokenDays": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0},"maximum":{"value":3650}}},
            "permanentAccounts": {"dataType":"boolean","required":true},
            "meshtasticEnabled": {"dataType":"boolean","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
            "overview": {"ref":"EventOverview","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EventPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"EventListItemDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
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
            "takLoginTokenDays": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0},"maximum":{"value":3650}}},
            "permanentAccounts": {"dataType":"boolean","required":true},
            "meshtasticEnabled": {"dataType":"boolean","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
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
            "takLoginTokenDays": {"dataType":"integer","validators":{"minimum":{"value":0},"maximum":{"value":3650}}},
            "permanentAccounts": {"dataType":"boolean"},
            "meshtasticEnabled": {"dataType":"boolean"},
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
            "takLoginTokenDays": {"dataType":"integer","validators":{"minimum":{"value":0},"maximum":{"value":3650}}},
            "permanentAccounts": {"dataType":"boolean"},
            "meshtasticEnabled": {"dataType":"boolean"},
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
    "EventAccountsMadePermanentResponse": {
        "dataType": "refObject",
        "properties": {
            "accounts": {"dataType":"double","required":true},
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
            "takRoleOverride": {"dataType":"union","subSchemas":[{"ref":"TakRole"},{"dataType":"enum","enums":[null]}],"required":true},
            "seesAllTakGroups": {"dataType":"boolean","required":true},
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
            "takRoleOverride": {"dataType":"union","subSchemas":[{"ref":"TakRole"},{"dataType":"enum","enums":[null]}]},
            "seesAllTakGroups": {"dataType":"boolean"},
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
            "takRoleOverride": {"dataType":"union","subSchemas":[{"ref":"TakRole"},{"dataType":"enum","enums":[null]}]},
            "seesAllTakGroups": {"dataType":"boolean"},
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
            "enrolledTakApps": {"dataType":"double","required":true},
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
    "ReorderGroupMembersRequest": {
        "dataType": "refObject",
        "properties": {
            "memberIds": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "notifyMembers": {"dataType":"boolean"},
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
    "CreateEventMemberRequest": {
        "dataType": "refObject",
        "properties": {
            "userId": {"ref":"Uuid","required":true},
            "eventRoleId": {"ref":"Uuid","required":true},
            "eventGroupId": {"ref":"Uuid","required":true},
            "callsignOverride": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"minLength":{"value":1},"maxLength":{"value":39}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatedEventMemberAccountResponse": {
        "dataType": "refObject",
        "properties": {
            "member": {"ref":"EventMemberDto","required":true},
            "user": {"ref":"UserDto","required":true},
            "setupLink": {"ref":"SetupLinkDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateEventMemberAccountRequest": {
        "dataType": "refObject",
        "properties": {
            "eventRoleId": {"ref":"Uuid","required":true},
            "eventGroupId": {"ref":"Uuid","required":true},
            "callsignOverride": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"minLength":{"value":1},"maxLength":{"value":39}}},
            "displayName": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "username": {"dataType":"string","validators":{"pattern":{"value":"^[a-z0-9._-]{3,32}$"}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateEventMemberRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "eventRoleId": {"ref":"Uuid","required":true},
            "eventGroupId": {"ref":"Uuid","required":true},
            "callsignOverride": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":39}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProvisioningName": {
        "dataType": "refAlias",
        "type": {"dataType":"string","validators":{"pattern":{"value":"^[A-Za-z0-9_-]+$"},"minLength":{"value":1},"maxLength":{"value":64}}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GroupProvisioning": {
        "dataType": "refObject",
        "properties": {
            "callsignFormat": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":64}}},
            "shortNamePrefix": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"pattern":{"value":"^[A-Z0-9]{1,3}$"}}},
            "tak": {"dataType":"nestedObjectLiteral","nestedProperties":{"serverGroups":{"dataType":"array","array":{"dataType":"refAlias","ref":"ProvisioningName"},"required":true,"validators":{"maxItems":{"value":20}}},"role":{"ref":"TakRole","required":true},"team":{"ref":"TakTeam","required":true}},"required":true},
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
    "ConfigurationRevisionReason": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["activation"]},{"dataType":"enum","enums":["reactivation"]},{"dataType":"enum","enums":["publish"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConfigurationRevisionSummaryDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "eventId": {"ref":"Uuid","required":true},
            "number": {"dataType":"double","required":true},
            "reason": {"ref":"ConfigurationRevisionReason","required":true},
            "createdAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConfigurationRevisionPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"ConfigurationRevisionSummaryDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SnapshotRole": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "slug": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "takRoleOverride": {"dataType":"union","subSchemas":[{"ref":"TakRole"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SnapshotGroup": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "slug": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "provisioning": {"ref":"GroupProvisioning","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SnapshotChannel": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "uplinkEnabled": {"dataType":"boolean","required":true},
            "downlinkEnabled": {"dataType":"boolean","required":true},
            "positionPrecision": {"dataType":"double","required":true},
            "secret": {"dataType":"boolean","required":true},
            "pskVersion": {"dataType":"double","required":true},
            "audience": {"ref":"EventAudience","required":true},
            "keyHolders": {"ref":"EventAudience","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SnapshotMeshtastic": {
        "dataType": "refObject",
        "properties": {
            "firmwareVersion": {"dataType":"string","required":true},
            "effectiveMinimumVersion": {"dataType":"string","required":true},
            "profileId": {"dataType":"string","required":true},
            "profileSha256": {"dataType":"string","required":true},
            "settings": {"ref":"FirmwareSettingsDocument","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AtakPreferenceTarget": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"nestedObjectLiteral","nestedProperties":{"type":{"dataType":"enum","enums":["event"],"required":true}}},{"dataType":"nestedObjectLiteral","nestedProperties":{"id":{"dataType":"string","required":true},"type":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["group"]},{"dataType":"enum","enums":["role"]},{"dataType":"enum","enums":["member"]}],"required":true}}}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AtakPreferenceType": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["string"]},{"dataType":"enum","enums":["boolean"]},{"dataType":"enum","enums":["integer"]},{"dataType":"enum","enums":["long"]},{"dataType":"enum","enums":["float"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TargetedAtakPreference": {
        "dataType": "refObject",
        "properties": {
            "preference": {"dataType":"string","required":true},
            "key": {"dataType":"string","required":true},
            "type": {"ref":"AtakPreferenceType","required":true},
            "value": {"dataType":"string","required":true},
            "target": {"ref":"AtakPreferenceTarget","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CurrentTakConfiguration": {
        "dataType": "refObject",
        "properties": {
            "meshChannelId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "atakPreferences": {"dataType":"array","array":{"dataType":"refObject","ref":"TargetedAtakPreference"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SnapshotTak": {
        "dataType": "refAlias",
        "type": {"ref":"CurrentTakConfiguration","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConfigurationSnapshot": {
        "dataType": "refObject",
        "properties": {
            "schemaVersion": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":[1]},{"dataType":"enum","enums":[2]},{"dataType":"enum","enums":[3]},{"dataType":"enum","enums":[4]},{"dataType":"enum","enums":[5]},{"dataType":"enum","enums":[6]},{"dataType":"enum","enums":[7]},{"dataType":"enum","enums":[8]}],"required":true},
            "meshtasticEnabled": {"dataType":"boolean","required":true},
            "roles": {"dataType":"array","array":{"dataType":"refObject","ref":"SnapshotRole"},"required":true},
            "groups": {"dataType":"array","array":{"dataType":"refObject","ref":"SnapshotGroup"},"required":true},
            "channels": {"dataType":"array","array":{"dataType":"refObject","ref":"SnapshotChannel"},"required":true},
            "meshtastic": {"dataType":"union","subSchemas":[{"ref":"SnapshotMeshtastic"},{"dataType":"enum","enums":[null]}],"required":true},
            "tak": {"dataType":"union","subSchemas":[{"ref":"SnapshotTak"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConfigurationRevisionDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "eventId": {"ref":"Uuid","required":true},
            "number": {"dataType":"double","required":true},
            "reason": {"ref":"ConfigurationRevisionReason","required":true},
            "createdAt": {"dataType":"string","required":true},
            "snapshot": {"ref":"ConfigurationSnapshot","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PublishConfigurationResponse": {
        "dataType": "refObject",
        "properties": {
            "created": {"dataType":"boolean","required":true},
            "revision": {"ref":"ConfigurationRevisionDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConfigurationChangeArea": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["event"]},{"dataType":"enum","enums":["roles"]},{"dataType":"enum","enums":["groups"]},{"dataType":"enum","enums":["channels"]},{"dataType":"enum","enums":["meshtastic"]},{"dataType":"enum","enums":["tak"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConfigurationChangeKind": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["added"]},{"dataType":"enum","enums":["removed"]},{"dataType":"enum","enums":["changed"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConfigurationChangeDto": {
        "dataType": "refObject",
        "properties": {
            "area": {"ref":"ConfigurationChangeArea","required":true},
            "kind": {"ref":"ConfigurationChangeKind","required":true},
            "name": {"dataType":"string","required":true},
            "fields": {"dataType":"array","array":{"dataType":"string"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PendingConfigurationChangesDto": {
        "dataType": "refObject",
        "properties": {
            "publishedRevision": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "changes": {"dataType":"array","array":{"dataType":"refObject","ref":"ConfigurationChangeDto"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SmtpSecurity": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["starttls"]},{"dataType":"enum","enums":["tls"]},{"dataType":"enum","enums":["none"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EmailSettingsDto": {
        "dataType": "refObject",
        "properties": {
            "enabled": {"dataType":"boolean","required":true},
            "host": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "port": {"dataType":"double","required":true},
            "security": {"ref":"SmtpSecurity","required":true},
            "username": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "passwordSet": {"dataType":"boolean","required":true},
            "fromAddress": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "fromName": {"dataType":"string","required":true},
            "version": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateEmailSettingsRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0}}},
            "enabled": {"dataType":"boolean","required":true},
            "host": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":253}}},
            "port": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1},"maximum":{"value":65535}}},
            "security": {"ref":"SmtpSecurity","required":true},
            "username": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":200}}},
            "password": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":500}}},
            "fromAddress": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":254},"pattern":{"value":"^[^\\s@]+@[^\\s@]+$"}}},
            "fromName": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SendTestEmailRequest": {
        "dataType": "refObject",
        "properties": {
            "to": {"dataType":"string","required":true,"validators":{"maxLength":{"value":254},"pattern":{"value":"^[^\\s@]+@[^\\s@]+$"}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DownloadGrantDto": {
        "dataType": "refObject",
        "properties": {
            "url": {"dataType":"string","required":true},
            "expiresAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DownloadGrantKind": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["device-profile"]},{"dataType":"enum","enums":["member-data-package"]},{"dataType":"enum","enums":["tak-connection-package"]},{"dataType":"enum","enums":["itak-connection-package"]},{"dataType":"enum","enums":["wintak-connection-package"]},{"dataType":"enum","enums":["atak-unlock-package"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateDownloadGrantRequest": {
        "dataType": "refObject",
        "properties": {
            "kind": {"ref":"DownloadGrantKind","required":true},
            "eventId": {"ref":"Uuid"},
            "memberId": {"ref":"Uuid"},
            "packageId": {"ref":"Uuid"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageRevisionSummaryDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "packageId": {"ref":"Uuid","required":true},
            "number": {"dataType":"double","required":true},
            "snapshotHash": {"dataType":"string","required":true},
            "createdAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageRevisionPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"PackageRevisionSummaryDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageSnapshotContent": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "layerId": {"dataType":"string","required":true},
            "blobId": {"dataType":"string","required":true},
            "kind": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "archivePath": {"dataType":"string","required":true},
            "sha256": {"dataType":"string","required":true},
            "size": {"dataType":"double","required":true},
            "mediaType": {"dataType":"string","required":true},
            "metadata": {"dataType":"any"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageSnapshot": {
        "dataType": "refObject",
        "properties": {
            "schema": {"dataType":"double","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "layers": {"dataType":"array","array":{"dataType":"refObject","ref":"PackageSnapshotLayer"},"required":true},
            "objects": {"dataType":"array","array":{"dataType":"refObject","ref":"PackageSnapshotObject"},"required":true},
            "contents": {"dataType":"array","array":{"dataType":"refObject","ref":"PackageSnapshotContent"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageRevisionDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "packageId": {"ref":"Uuid","required":true},
            "number": {"dataType":"double","required":true},
            "snapshotHash": {"dataType":"string","required":true},
            "createdAt": {"dataType":"string","required":true},
            "snapshot": {"ref":"PackageSnapshot","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PublishDataPackageResponse": {
        "dataType": "refObject",
        "properties": {
            "created": {"dataType":"boolean","required":true},
            "revision": {"ref":"PackageRevisionDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresentationLoss": {
        "dataType": "refObject",
        "properties": {
            "objectId": {"dataType":"string","required":true},
            "objectName": {"dataType":"string","required":true},
            "code": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PresentationReport": {
        "dataType": "refObject",
        "properties": {
            "format": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["cot"]},{"dataType":"enum","enums":["kml"]}],"required":true},
            "losses": {"dataType":"array","array":{"dataType":"refObject","ref":"PresentationLoss"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DataPackageContentSummary": {
        "dataType": "refObject",
        "properties": {
            "points": {"dataType":"double","required":true},
            "lines": {"dataType":"double","required":true},
            "polygons": {"dataType":"double","required":true},
            "circles": {"dataType":"double","required":true},
            "rectangles": {"dataType":"double"},
            "ellipses": {"dataType":"double"},
            "routes": {"dataType":"double"},
            "offlineMaps": {"dataType":"double","required":true},
            "rubberSheets": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DataPackageSourceDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "sourcePackageId": {"ref":"Uuid","required":true},
            "sourcePackageName": {"dataType":"string","required":true},
            "sourceRevision": {"dataType":"double","required":true},
            "sourceSnapshotHash": {"dataType":"string","required":true},
            "sourceLayerIds": {"dataType":"array","array":{"dataType":"refAlias","ref":"Uuid"},"required":true},
            "createdAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageAudience": {
        "dataType": "refObject",
        "properties": {
            "groupIds": {"dataType":"array","array":{"dataType":"refAlias","ref":"Uuid"},"required":true,"validators":{"maxItems":{"value":100}}},
            "roleIds": {"dataType":"array","array":{"dataType":"refAlias","ref":"Uuid"},"required":true,"validators":{"maxItems":{"value":100}}},
            "memberIds": {"dataType":"array","array":{"dataType":"refAlias","ref":"Uuid"},"required":true,"validators":{"maxItems":{"value":500}}},
            "allMembers": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageTakDelivery": {
        "dataType": "refObject",
        "properties": {
            "onEnrollment": {"dataType":"boolean","required":true},
            "onConnection": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DataPackageDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "eventId": {"ref":"Uuid","required":true},
            "kind": {"ref":"DataPackageKind","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "latestRevision": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "latestRevisionSize": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "hasUnpublishedChanges": {"dataType":"boolean","required":true},
            "draftContents": {"ref":"DataPackageContentSummary","required":true},
            "sources": {"dataType":"array","array":{"dataType":"refObject","ref":"DataPackageSourceDto"},"required":true},
            "audience": {"ref":"PackageAudience","required":true},
            "writers": {"ref":"EventAudience","required":true},
            "takDelivery": {"ref":"PackageTakDelivery","required":true},
            "sortOrder": {"dataType":"double","required":true},
            "version": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReorderDataPackagesRequest": {
        "dataType": "refObject",
        "properties": {
            "packageIds": {"dataType":"array","array":{"dataType":"string"},"required":true,"validators":{"maxItems":{"value":500}}},
            "kind": {"ref":"DataPackageKind"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageObjectDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "packageId": {"ref":"Uuid","required":true},
            "layerId": {"ref":"Uuid","required":true},
            "kind": {"ref":"PackageObjectKind","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "geometry": {"ref":"PackageGeometry","required":true},
            "style": {"ref":"PackageObjectStyle","required":true},
            "tak": {"dataType":"union","subSchemas":[{"ref":"TakMarker"},{"dataType":"enum","enums":[null]}],"required":true},
            "version": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchPackageObjectsResponse": {
        "dataType": "refObject",
        "properties": {
            "updated": {"dataType":"array","array":{"dataType":"refObject","ref":"PackageObjectDto"},"required":true},
            "created": {"dataType":"array","array":{"dataType":"refObject","ref":"PackageObjectDto"},"required":true},
            "deletedIds": {"dataType":"array","array":{"dataType":"refAlias","ref":"Uuid"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchPackageObjectUpdate": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "layerId": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":2000}}},
            "geometry": {"ref":"PackageGeometry","required":true},
            "style": {"ref":"PackageObjectStyle","required":true},
            "tak": {"dataType":"union","subSchemas":[{"ref":"TakMarker"},{"dataType":"enum","enums":[null]}],"required":true},
            "id": {"ref":"Uuid","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchPackageObjectDelete": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatePackageObjectRequest": {
        "dataType": "refObject",
        "properties": {
            "layerId": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":2000}}},
            "geometry": {"ref":"PackageGeometry","required":true},
            "style": {"ref":"PackageObjectStyle"},
            "tak": {"dataType":"union","subSchemas":[{"ref":"TakMarker"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BatchPackageObjectsRequest": {
        "dataType": "refObject",
        "properties": {
            "updates": {"dataType":"array","array":{"dataType":"refObject","ref":"BatchPackageObjectUpdate"},"required":true,"validators":{"maxItems":{"value":500}}},
            "deletes": {"dataType":"array","array":{"dataType":"refObject","ref":"BatchPackageObjectDelete"},"required":true,"validators":{"maxItems":{"value":500}}},
            "creates": {"dataType":"array","array":{"dataType":"refObject","ref":"CreatePackageObjectRequest"},"required":true,"validators":{"maxItems":{"value":500}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageObjectPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"PackageObjectDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdatePackageObjectRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "layerId": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":2000}}},
            "geometry": {"ref":"PackageGeometry","required":true},
            "style": {"ref":"PackageObjectStyle","required":true},
            "tak": {"dataType":"union","subSchemas":[{"ref":"TakMarker"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ImportReport": {
        "dataType": "refObject",
        "properties": {
            "accepted": {"dataType":"double","required":true},
            "changed": {"dataType":"array","array":{"dataType":"refObject","ref":"ImportReportEntry"},"required":true},
            "retained": {"dataType":"array","array":{"dataType":"refObject","ref":"ImportReportEntry"},"required":true},
            "skipped": {"dataType":"array","array":{"dataType":"refObject","ref":"ImportReportEntry"},"required":true},
            "rejected": {"dataType":"array","array":{"dataType":"refObject","ref":"ImportReportEntry"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ImportedDataPackage": {
        "dataType": "refObject",
        "properties": {
            "dataPackage": {"ref":"DataPackageDto","required":true},
            "report": {"ref":"ImportReport","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageLayerDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "packageId": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "sortOrder": {"dataType":"double","required":true},
            "visible": {"dataType":"boolean","required":true},
            "locked": {"dataType":"boolean","required":true},
            "version": {"dataType":"double","required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageLayerPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"PackageLayerDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatePackageLayerRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdatePackageLayerRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "sortOrder": {"dataType":"integer","required":true,"validators":{"minimum":{"value":0},"maximum":{"value":10000}}},
            "visible": {"dataType":"boolean","required":true},
            "locked": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GeoJsonDocument": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"string","required":true},
        },
        "additionalProperties": {"dataType":"any"},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GeoJsonFeatureCollection": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"enum","enums":["FeatureCollection"],"required":true},
            "features": {"dataType":"array","array":{"dataType":"any"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CombinedExportSelection": {
        "dataType": "refObject",
        "properties": {
            "packageId": {"ref":"Uuid","required":true},
            "revision": {"dataType":"integer","validators":{"minimum":{"value":1}}},
            "layerIds": {"dataType":"array","array":{"dataType":"refAlias","ref":"Uuid"},"validators":{"minItems":{"value":1},"maxItems":{"value":100}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateDataPackageCopyRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":1000}}},
            "kind": {"ref":"DataPackageKind"},
            "source": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["published"]},{"dataType":"enum","enums":["draft"]}]},
            "packages": {"dataType":"array","array":{"dataType":"refObject","ref":"CombinedExportSelection"},"required":true,"validators":{"minItems":{"value":1},"maxItems":{"value":100}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RubberSheetDto": {
        "dataType": "refObject",
        "properties": {
            "corners": {"dataType":"array","array":{"dataType":"array","array":{"dataType":"double"}},"required":true},
            "imageMediaType": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["image/png"]},{"dataType":"enum","enums":["image/jpeg"]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OfflineMapDto": {
        "dataType": "refObject",
        "properties": {
            "minZoom": {"dataType":"double","required":true},
            "maxZoom": {"dataType":"double","required":true},
            "bounds": {"dataType":"array","array":{"dataType":"double"},"required":true},
            "tiles": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PackageContentDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"ref":"Uuid","required":true},
            "layerId": {"ref":"Uuid","required":true},
            "kind": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["offline-map"]},{"dataType":"enum","enums":["nested-data-package"]},{"dataType":"enum","enums":["rubber-sheet"]},{"dataType":"enum","enums":["icon-library"]}],"required":true},
            "name": {"dataType":"string","required":true},
            "size": {"dataType":"double","required":true},
            "rubberSheet": {"dataType":"union","subSchemas":[{"ref":"RubberSheetDto"},{"dataType":"enum","enums":[null]}],"required":true},
            "offlineMap": {"dataType":"union","subSchemas":[{"ref":"OfflineMapDto"},{"dataType":"enum","enums":[null]}],"required":true},
            "visible": {"dataType":"boolean","required":true},
            "opacity": {"dataType":"double","required":true},
            "version": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdatePackageContentRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":200}}},
            "layerId": {"dataType":"string","required":true},
            "visible": {"dataType":"boolean","required":true},
            "opacity": {"dataType":"double","required":true,"validators":{"minimum":{"value":0},"maximum":{"value":1}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IconLibraryImportResult": {
        "dataType": "refObject",
        "properties": {
            "contentId": {"ref":"Uuid","required":true},
            "accepted": {"dataType":"double","required":true},
            "rejected": {"dataType":"array","array":{"dataType":"refObject","ref":"ImportReportEntry"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DataPackagePage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"DataPackageDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateDataPackageRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":1000}}},
            "kind": {"ref":"DataPackageKind"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateDataPackageRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":1000}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdatePackageAudienceRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "audience": {"ref":"PackageAudience","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdatePackageWritersRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "writers": {"ref":"EventAudience","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdatePackageTakDeliveryRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "takDelivery": {"ref":"PackageTakDelivery","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CombinedExportIncluded": {
        "dataType": "refObject",
        "properties": {
            "packageId": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "revision": {"dataType":"double","required":true},
            "objects": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CombinedExportSkipped": {
        "dataType": "refObject",
        "properties": {
            "packageId": {"ref":"Uuid","required":true},
            "name": {"dataType":"string","required":true},
            "reason": {"dataType":"enum","enums":["not-published"],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CombinedExportNameClash": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "packageIds": {"dataType":"array","array":{"dataType":"refAlias","ref":"Uuid"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CombinedExportReport": {
        "dataType": "refObject",
        "properties": {
            "included": {"dataType":"array","array":{"dataType":"refObject","ref":"CombinedExportIncluded"},"required":true},
            "skipped": {"dataType":"array","array":{"dataType":"refObject","ref":"CombinedExportSkipped"},"required":true},
            "nameClashes": {"dataType":"array","array":{"dataType":"refObject","ref":"CombinedExportNameClash"},"required":true},
            "presentationLosses": {"dataType":"array","array":{"dataType":"refObject","ref":"PresentationLoss"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CombinedExportRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "packages": {"dataType":"array","array":{"dataType":"refObject","ref":"CombinedExportSelection"},"required":true,"validators":{"minItems":{"value":1},"maxItems":{"value":100}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiClientStatus": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["active"]},{"dataType":"enum","enums":["disabled"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiClientDto": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "status": {"ref":"ApiClientStatus","required":true},
            "version": {"dataType":"double","required":true},
            "permissions": {"dataType":"array","array":{"dataType":"refObject","ref":"PermissionGrantDto"},"required":true},
            "createdAt": {"dataType":"string","required":true},
            "updatedAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ApiClientPage": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"ApiClientDto"},"required":true},
            "page": {"ref":"PageInfo","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateApiClientRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"validators":{"maxLength":{"value":500}}},
            "permissions": {"dataType":"array","array":{"dataType":"refObject","ref":"PermissionGrantDto"},"required":true,"validators":{"maxItems":{"value":100}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateApiClientRequest": {
        "dataType": "refObject",
        "properties": {
            "version": {"dataType":"integer","required":true,"validators":{"minimum":{"value":1}}},
            "name": {"dataType":"string","required":true,"validators":{"minLength":{"value":1},"maxLength":{"value":100}}},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true,"validators":{"maxLength":{"value":500}}},
            "status": {"ref":"ApiClientStatus","required":true},
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
            "apiClientId": {"dataType":"string","required":true},
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
    "AccountSetupRequest": {
        "dataType": "refObject",
        "properties": {
            "newPassword": {"dataType":"string","required":true,"validators":{"minLength":{"value":12},"maxLength":{"value":128}}},
            "username": {"dataType":"string","validators":{"pattern":{"value":"^[a-z0-9._-]{3,32}$"}}},
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
                search: {"in":"query","name":"search","dataType":"string"},
                accountType: {"in":"query","name":"accountType","ref":"UserAccountType"},
        };
        app.get('/api/v1/users',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
        const argsUsersController_createUser: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateUserRequest"},
        };
        app.post('/api/v1/users',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.createUser)),

            async function UsersController_createUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_createUser, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'createUser',
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
        const argsUsersController_getUser: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/users/:userId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
        const argsUsersController_updateUser: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateUserRequest"},
        };
        app.put('/api/v1/users/:userId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.updateUser)),

            async function UsersController_updateUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_updateUser, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'updateUser',
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
        const argsUsersController_disableUser: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/users/:userId/disable',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.disableUser)),

            async function UsersController_disableUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_disableUser, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'disableUser',
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
        const argsUsersController_enableUser: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/users/:userId/enable',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.enableUser)),

            async function UsersController_enableUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_enableUser, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'enableUser',
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
        const argsUsersController_sendUserPasswordReset: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/users/:userId/password-reset',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.sendUserPasswordReset)),

            async function UsersController_sendUserPasswordReset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_sendUserPasswordReset, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'sendUserPasswordReset',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 202,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_createSetupLink: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/users/:userId/setup-link',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.createSetupLink)),

            async function UsersController_createSetupLink(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_createSetupLink, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'createSetupLink',
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
        const argsUsersController_revokeUserSessions: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/users/:userId/revoke-sessions',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.revokeUserSessions)),

            async function UsersController_revokeUserSessions(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_revokeUserSessions, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'revokeUserSessions',
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
        const argsUsersController_makeUserPermanent: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                userId: {"in":"path","name":"userId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/users/:userId/make-permanent',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.makeUserPermanent)),

            async function UsersController_makeUserPermanent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_makeUserPermanent, request, response });

                const controller = new UsersController();

              await templateService.apiHandler({
                methodName: 'makeUserPermanent',
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
        const argsSetupLinkExchangeController_exchangeSetupLink: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"SetupLinkExchangeRequest"},
        };
        app.post('/api/v1/auth/setup-links/exchange',
            ...(fetchMiddlewares<RequestHandler>(SetupLinkExchangeController)),
            ...(fetchMiddlewares<RequestHandler>(SetupLinkExchangeController.prototype.exchangeSetupLink)),

            async function SetupLinkExchangeController_exchangeSetupLink(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSetupLinkExchangeController_exchangeSetupLink, request, response });

                const controller = new SetupLinkExchangeController();

              await templateService.apiHandler({
                methodName: 'exchangeSetupLink',
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
        const argsTakTrafficRecordingController_getTakTrafficRecording: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/tak-traffic/recording',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakTrafficRecordingController)),
            ...(fetchMiddlewares<RequestHandler>(TakTrafficRecordingController.prototype.getTakTrafficRecording)),

            async function TakTrafficRecordingController_getTakTrafficRecording(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakTrafficRecordingController_getTakTrafficRecording, request, response });

                const controller = new TakTrafficRecordingController();

              await templateService.apiHandler({
                methodName: 'getTakTrafficRecording',
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
        const argsTakTrafficRecordingController_updateTakTrafficRecording: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateTakTrafficRecordingRequest"},
        };
        app.put('/api/v1/events/:eventId/tak-traffic/recording',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakTrafficRecordingController)),
            ...(fetchMiddlewares<RequestHandler>(TakTrafficRecordingController.prototype.updateTakTrafficRecording)),

            async function TakTrafficRecordingController_updateTakTrafficRecording(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakTrafficRecordingController_updateTakTrafficRecording, request, response });

                const controller = new TakTrafficRecordingController();

              await templateService.apiHandler({
                methodName: 'updateTakTrafficRecording',
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
        const argsTakTrafficRecordingController_exportTakTraffic: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/tak-traffic/recording/export',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakTrafficRecordingController)),
            ...(fetchMiddlewares<RequestHandler>(TakTrafficRecordingController.prototype.exportTakTraffic)),

            async function TakTrafficRecordingController_exportTakTraffic(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakTrafficRecordingController_exportTakTraffic, request, response });

                const controller = new TakTrafficRecordingController();

              await templateService.apiHandler({
                methodName: 'exportTakTraffic',
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
        const argsTakTrafficHistoryController_getTakTrafficHistory: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                from: {"in":"query","name":"from","required":true,"dataType":"string"},
                to: {"in":"query","name":"to","required":true,"dataType":"string"},
                groupId: {"in":"query","name":"groupId","ref":"Uuid"},
                uid: {"in":"query","name":"uid","dataType":"string","validators":{"maxLength":{"value":200}}},
                gapSeconds: {"in":"query","name":"gapSeconds","dataType":"integer","validators":{"isInt":{"errorMsg":"gapSeconds"},"minimum":{"value":30},"maximum":{"value":3600}}},
        };
        app.get('/api/v1/events/:eventId/tak-traffic/history',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakTrafficHistoryController)),
            ...(fetchMiddlewares<RequestHandler>(TakTrafficHistoryController.prototype.getTakTrafficHistory)),

            async function TakTrafficHistoryController_getTakTrafficHistory(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakTrafficHistoryController_getTakTrafficHistory, request, response });

                const controller = new TakTrafficHistoryController();

              await templateService.apiHandler({
                methodName: 'getTakTrafficHistory',
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
        const argsTakTrafficHistoryController_exportTakTracks: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                format: {"in":"query","name":"format","required":true,"ref":"TakTrafficExportFormat"},
                from: {"in":"query","name":"from","required":true,"dataType":"string"},
                to: {"in":"query","name":"to","required":true,"dataType":"string"},
                groupId: {"in":"query","name":"groupId","ref":"Uuid"},
                uid: {"in":"query","name":"uid","dataType":"string","validators":{"maxLength":{"value":200}}},
                gapSeconds: {"in":"query","name":"gapSeconds","dataType":"integer","validators":{"isInt":{"errorMsg":"gapSeconds"},"minimum":{"value":30},"maximum":{"value":3600}}},
        };
        app.get('/api/v1/events/:eventId/tak-traffic/history/export',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakTrafficHistoryController)),
            ...(fetchMiddlewares<RequestHandler>(TakTrafficHistoryController.prototype.exportTakTracks)),

            async function TakTrafficHistoryController_exportTakTracks(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakTrafficHistoryController_exportTakTracks, request, response });

                const controller = new TakTrafficHistoryController();

              await templateService.apiHandler({
                methodName: 'exportTakTracks',
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
        const argsTakTrafficHistoryController_deleteRecordedTakTraffic: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                uid: {"in":"query","name":"uid","dataType":"string","validators":{"maxLength":{"value":200}}},
        };
        app.delete('/api/v1/events/:eventId/tak-traffic/recording/items',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakTrafficHistoryController)),
            ...(fetchMiddlewares<RequestHandler>(TakTrafficHistoryController.prototype.deleteRecordedTakTraffic)),

            async function TakTrafficHistoryController_deleteRecordedTakTraffic(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakTrafficHistoryController_deleteRecordedTakTraffic, request, response });

                const controller = new TakTrafficHistoryController();

              await templateService.apiHandler({
                methodName: 'deleteRecordedTakTraffic',
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
        const argsTakServerSettingsController_getTakServerSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/tak-server/settings',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakServerSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(TakServerSettingsController.prototype.getTakServerSettings)),

            async function TakServerSettingsController_getTakServerSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakServerSettingsController_getTakServerSettings, request, response });

                const controller = new TakServerSettingsController();

              await templateService.apiHandler({
                methodName: 'getTakServerSettings',
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
        const argsTakServerSettingsController_updateTakServerSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateTakServerSettingsRequest"},
        };
        app.put('/api/v1/tak-server/settings',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakServerSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(TakServerSettingsController.prototype.updateTakServerSettings)),

            async function TakServerSettingsController_updateTakServerSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakServerSettingsController_updateTakServerSettings, request, response });

                const controller = new TakServerSettingsController();

              await templateService.apiHandler({
                methodName: 'updateTakServerSettings',
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
        const argsTakServerSettingsController_addTakServerCertificate: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"AddTakServerCertificateRequest"},
        };
        app.put('/api/v1/tak-server/server-certificate',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakServerSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(TakServerSettingsController.prototype.addTakServerCertificate)),

            async function TakServerSettingsController_addTakServerCertificate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakServerSettingsController_addTakServerCertificate, request, response });

                const controller = new TakServerSettingsController();

              await templateService.apiHandler({
                methodName: 'addTakServerCertificate',
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
        const argsTakServerSettingsController_removeTakServerCertificate: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.delete('/api/v1/tak-server/server-certificate',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakServerSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(TakServerSettingsController.prototype.removeTakServerCertificate)),

            async function TakServerSettingsController_removeTakServerCertificate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakServerSettingsController_removeTakServerCertificate, request, response });

                const controller = new TakServerSettingsController();

              await templateService.apiHandler({
                methodName: 'removeTakServerCertificate',
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
        const argsTakServerSettingsController_useTakCertificateFiles: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"UseTakCertificateFilesRequest"},
        };
        app.put('/api/v1/tak-server/server-certificate/files',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakServerSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(TakServerSettingsController.prototype.useTakCertificateFiles)),

            async function TakServerSettingsController_useTakCertificateFiles(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakServerSettingsController_useTakCertificateFiles, request, response });

                const controller = new TakServerSettingsController();

              await templateService.apiHandler({
                methodName: 'useTakCertificateFiles',
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
        const argsLiveTakTrafficController_getLiveTakTraffic: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/tak-traffic',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(LiveTakTrafficController)),
            ...(fetchMiddlewares<RequestHandler>(LiveTakTrafficController.prototype.getLiveTakTraffic)),

            async function LiveTakTrafficController_getLiveTakTraffic(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLiveTakTrafficController_getLiveTakTraffic, request, response });

                const controller = new LiveTakTrafficController();

              await templateService.apiHandler({
                methodName: 'getLiveTakTraffic',
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
        const argsTakEnrollmentsController_createTakEnrollment: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/v1/me/tak-enrollments',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakEnrollmentsController)),
            ...(fetchMiddlewares<RequestHandler>(TakEnrollmentsController.prototype.createTakEnrollment)),

            async function TakEnrollmentsController_createTakEnrollment(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakEnrollmentsController_createTakEnrollment, request, response });

                const controller = new TakEnrollmentsController();

              await templateService.apiHandler({
                methodName: 'createTakEnrollment',
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
        const argsTakConnectionPackageController_getTakConnectionPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/me/tak-connection-package',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakConnectionPackageController)),
            ...(fetchMiddlewares<RequestHandler>(TakConnectionPackageController.prototype.getTakConnectionPackage)),

            async function TakConnectionPackageController_getTakConnectionPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakConnectionPackageController_getTakConnectionPackage, request, response });

                const controller = new TakConnectionPackageController();

              await templateService.apiHandler({
                methodName: 'getTakConnectionPackage',
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
        const argsItakConnectionPackageController_getItakConnectionPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/me/itak-connection-package',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ItakConnectionPackageController)),
            ...(fetchMiddlewares<RequestHandler>(ItakConnectionPackageController.prototype.getItakConnectionPackage)),

            async function ItakConnectionPackageController_getItakConnectionPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsItakConnectionPackageController_getItakConnectionPackage, request, response });

                const controller = new ItakConnectionPackageController();

              await templateService.apiHandler({
                methodName: 'getItakConnectionPackage',
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
        const argsWintakConnectionPackageController_getWintakConnectionPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/me/wintak-connection-package',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(WintakConnectionPackageController)),
            ...(fetchMiddlewares<RequestHandler>(WintakConnectionPackageController.prototype.getWintakConnectionPackage)),

            async function WintakConnectionPackageController_getWintakConnectionPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWintakConnectionPackageController_getWintakConnectionPackage, request, response });

                const controller = new WintakConnectionPackageController();

              await templateService.apiHandler({
                methodName: 'getWintakConnectionPackage',
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
        const argsTakClientCertificatesController_listTakClientCertificates: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/tak-server/client-certificates',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakClientCertificatesController)),
            ...(fetchMiddlewares<RequestHandler>(TakClientCertificatesController.prototype.listTakClientCertificates)),

            async function TakClientCertificatesController_listTakClientCertificates(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakClientCertificatesController_listTakClientCertificates, request, response });

                const controller = new TakClientCertificatesController();

              await templateService.apiHandler({
                methodName: 'listTakClientCertificates',
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
        const argsTakClientCertificatesController_revokeTakClientCertificate: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                certificateId: {"in":"path","name":"certificateId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"RevokeTakCertificateRequest"},
        };
        app.post('/api/v1/tak-server/client-certificates/:certificateId/revoke',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakClientCertificatesController)),
            ...(fetchMiddlewares<RequestHandler>(TakClientCertificatesController.prototype.revokeTakClientCertificate)),

            async function TakClientCertificatesController_revokeTakClientCertificate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakClientCertificatesController_revokeTakClientCertificate, request, response });

                const controller = new TakClientCertificatesController();

              await templateService.apiHandler({
                methodName: 'revokeTakClientCertificate',
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
        const argsMyTakCertificatesController_listMyTakCertificates: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/me/tak-certificates',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MyTakCertificatesController)),
            ...(fetchMiddlewares<RequestHandler>(MyTakCertificatesController.prototype.listMyTakCertificates)),

            async function MyTakCertificatesController_listMyTakCertificates(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMyTakCertificatesController_listMyTakCertificates, request, response });

                const controller = new MyTakCertificatesController();

              await templateService.apiHandler({
                methodName: 'listMyTakCertificates',
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
        const argsMyTakCertificatesController_revokeMyTakCertificate: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                certificateId: {"in":"path","name":"certificateId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"RevokeTakCertificateRequest"},
        };
        app.post('/api/v1/me/tak-certificates/:certificateId/revoke',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MyTakCertificatesController)),
            ...(fetchMiddlewares<RequestHandler>(MyTakCertificatesController.prototype.revokeMyTakCertificate)),

            async function MyTakCertificatesController_revokeMyTakCertificate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMyTakCertificatesController_revokeMyTakCertificate, request, response });

                const controller = new MyTakCertificatesController();

              await templateService.apiHandler({
                methodName: 'revokeMyTakCertificate',
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
        const argsTakCertificateAuthoritiesController_listTakCertificateAuthorities: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/tak-server/certificate-authorities',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakCertificateAuthoritiesController)),
            ...(fetchMiddlewares<RequestHandler>(TakCertificateAuthoritiesController.prototype.listTakCertificateAuthorities)),

            async function TakCertificateAuthoritiesController_listTakCertificateAuthorities(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakCertificateAuthoritiesController_listTakCertificateAuthorities, request, response });

                const controller = new TakCertificateAuthoritiesController();

              await templateService.apiHandler({
                methodName: 'listTakCertificateAuthorities',
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
        const argsTakCertificateAuthoritiesController_rotateTakCertificateAuthority: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/v1/tak-server/certificate-authorities/rotate',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakCertificateAuthoritiesController)),
            ...(fetchMiddlewares<RequestHandler>(TakCertificateAuthoritiesController.prototype.rotateTakCertificateAuthority)),

            async function TakCertificateAuthoritiesController_rotateTakCertificateAuthority(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakCertificateAuthoritiesController_rotateTakCertificateAuthority, request, response });

                const controller = new TakCertificateAuthoritiesController();

              await templateService.apiHandler({
                methodName: 'rotateTakCertificateAuthority',
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
        const argsTakCertificateAuthoritiesController_importTakCertificateAuthority: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"ImportTakCertificateAuthorityRequest"},
        };
        app.post('/api/v1/tak-server/certificate-authorities/import',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakCertificateAuthoritiesController)),
            ...(fetchMiddlewares<RequestHandler>(TakCertificateAuthoritiesController.prototype.importTakCertificateAuthority)),

            async function TakCertificateAuthoritiesController_importTakCertificateAuthority(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakCertificateAuthoritiesController_importTakCertificateAuthority, request, response });

                const controller = new TakCertificateAuthoritiesController();

              await templateService.apiHandler({
                methodName: 'importTakCertificateAuthority',
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
        const argsTakAcmeSettingsController_getSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/tak-server/acme',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakAcmeSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(TakAcmeSettingsController.prototype.getSettings)),

            async function TakAcmeSettingsController_getSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakAcmeSettingsController_getSettings, request, response });

                const controller = new TakAcmeSettingsController();

              await templateService.apiHandler({
                methodName: 'getSettings',
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
        const argsTakAcmeSettingsController_updateSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateTakAcmeSettingsRequest"},
        };
        app.put('/api/v1/tak-server/acme',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakAcmeSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(TakAcmeSettingsController.prototype.updateSettings)),

            async function TakAcmeSettingsController_updateSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakAcmeSettingsController_updateSettings, request, response });

                const controller = new TakAcmeSettingsController();

              await templateService.apiHandler({
                methodName: 'updateSettings',
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
        const argsTakAcmeSettingsController_renew: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/v1/tak-server/acme/renew',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakAcmeSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(TakAcmeSettingsController.prototype.renew)),

            async function TakAcmeSettingsController_renew(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakAcmeSettingsController_renew, request, response });

                const controller = new TakAcmeSettingsController();

              await templateService.apiHandler({
                methodName: 'renew',
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
        const argsTakAcmeSettingsController_test: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/v1/tak-server/acme/test',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakAcmeSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(TakAcmeSettingsController.prototype.test)),

            async function TakAcmeSettingsController_test(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakAcmeSettingsController_test, request, response });

                const controller = new TakAcmeSettingsController();

              await templateService.apiHandler({
                methodName: 'test',
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
        const argsTakGroupsController_listTakGroups: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/events/:eventId/tak/groups',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(TakGroupsController.prototype.listTakGroups)),

            async function TakGroupsController_listTakGroups(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakGroupsController_listTakGroups, request, response });

                const controller = new TakGroupsController();

              await templateService.apiHandler({
                methodName: 'listTakGroups',
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
        const argsTakGroupsController_createTakGroup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateTakGroupRequest"},
                _idempotencyKey: {"in":"header","name":"Idempotency-Key","dataType":"string"},
        };
        app.post('/api/v1/events/:eventId/tak/groups',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(TakGroupsController.prototype.createTakGroup)),

            async function TakGroupsController_createTakGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakGroupsController_createTakGroup, request, response });

                const controller = new TakGroupsController();

              await templateService.apiHandler({
                methodName: 'createTakGroup',
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
        const argsTakGroupsController_getTakGroup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                groupId: {"in":"path","name":"groupId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/tak/groups/:groupId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(TakGroupsController.prototype.getTakGroup)),

            async function TakGroupsController_getTakGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakGroupsController_getTakGroup, request, response });

                const controller = new TakGroupsController();

              await templateService.apiHandler({
                methodName: 'getTakGroup',
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
        const argsTakGroupsController_updateTakGroup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                groupId: {"in":"path","name":"groupId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateTakGroupRequest"},
        };
        app.put('/api/v1/events/:eventId/tak/groups/:groupId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(TakGroupsController.prototype.updateTakGroup)),

            async function TakGroupsController_updateTakGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakGroupsController_updateTakGroup, request, response });

                const controller = new TakGroupsController();

              await templateService.apiHandler({
                methodName: 'updateTakGroup',
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
        const argsTakGroupsController_deleteTakGroup: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                groupId: {"in":"path","name":"groupId","required":true,"ref":"Uuid"},
        };
        app.delete('/api/v1/events/:eventId/tak/groups/:groupId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakGroupsController)),
            ...(fetchMiddlewares<RequestHandler>(TakGroupsController.prototype.deleteTakGroup)),

            async function TakGroupsController_deleteTakGroup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakGroupsController_deleteTakGroup, request, response });

                const controller = new TakGroupsController();

              await templateService.apiHandler({
                methodName: 'deleteTakGroup',
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
        const argsTakConfigurationController_getTakConfiguration: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/tak/configuration',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakConfigurationController)),
            ...(fetchMiddlewares<RequestHandler>(TakConfigurationController.prototype.getTakConfiguration)),

            async function TakConfigurationController_getTakConfiguration(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakConfigurationController_getTakConfiguration, request, response });

                const controller = new TakConfigurationController();

              await templateService.apiHandler({
                methodName: 'getTakConfiguration',
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
        const argsTakConfigurationController_updateTakConfiguration: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateTakConfigurationRequest"},
        };
        app.put('/api/v1/events/:eventId/tak/configuration',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakConfigurationController)),
            ...(fetchMiddlewares<RequestHandler>(TakConfigurationController.prototype.updateTakConfiguration)),

            async function TakConfigurationController_updateTakConfiguration(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakConfigurationController_updateTakConfiguration, request, response });

                const controller = new TakConfigurationController();

              await templateService.apiHandler({
                methodName: 'updateTakConfiguration',
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
        const argsAtakPreferencesController_getAtakPreferences: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/tak/atak-preferences',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AtakPreferencesController)),
            ...(fetchMiddlewares<RequestHandler>(AtakPreferencesController.prototype.getAtakPreferences)),

            async function AtakPreferencesController_getAtakPreferences(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAtakPreferencesController_getAtakPreferences, request, response });

                const controller = new AtakPreferencesController();

              await templateService.apiHandler({
                methodName: 'getAtakPreferences',
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
        const argsAtakPreferencesController_replaceAtakPreferences: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"ReplaceAtakPreferencesRequest"},
        };
        app.put('/api/v1/events/:eventId/tak/atak-preferences',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AtakPreferencesController)),
            ...(fetchMiddlewares<RequestHandler>(AtakPreferencesController.prototype.replaceAtakPreferences)),

            async function AtakPreferencesController_replaceAtakPreferences(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAtakPreferencesController_replaceAtakPreferences, request, response });

                const controller = new AtakPreferencesController();

              await templateService.apiHandler({
                methodName: 'replaceAtakPreferences',
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
        const argsAtakPreferencesController_importAtakPreferences: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"ImportAtakPreferencesRequest"},
        };
        app.post('/api/v1/events/:eventId/tak/atak-preferences/import',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AtakPreferencesController)),
            ...(fetchMiddlewares<RequestHandler>(AtakPreferencesController.prototype.importAtakPreferences)),

            async function AtakPreferencesController_importAtakPreferences(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAtakPreferencesController_importAtakPreferences, request, response });

                const controller = new AtakPreferencesController();

              await templateService.apiHandler({
                methodName: 'importAtakPreferences',
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
        const argsAtakPreferencesController_downloadAtakUnlockPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/tak/atak-preferences/unlock-package',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AtakPreferencesController)),
            ...(fetchMiddlewares<RequestHandler>(AtakPreferencesController.prototype.downloadAtakUnlockPackage)),

            async function AtakPreferencesController_downloadAtakUnlockPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAtakPreferencesController_downloadAtakUnlockPackage, request, response });

                const controller = new AtakPreferencesController();

              await templateService.apiHandler({
                methodName: 'downloadAtakUnlockPackage',
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
        const argsAtakPreferenceCatalogController_getAtakPreferenceCatalog: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/tak/atak-preference-catalog',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AtakPreferenceCatalogController)),
            ...(fetchMiddlewares<RequestHandler>(AtakPreferenceCatalogController.prototype.getAtakPreferenceCatalog)),

            async function AtakPreferenceCatalogController_getAtakPreferenceCatalog(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAtakPreferenceCatalogController_getAtakPreferenceCatalog, request, response });

                const controller = new AtakPreferenceCatalogController();

              await templateService.apiHandler({
                methodName: 'getAtakPreferenceCatalog',
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
        const argsSetupController_getSetupStatus: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/v1/setup',
            ...(fetchMiddlewares<RequestHandler>(SetupController)),
            ...(fetchMiddlewares<RequestHandler>(SetupController.prototype.getSetupStatus)),

            async function SetupController_getSetupStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSetupController_getSetupStatus, request, response });

                const controller = new SetupController();

              await templateService.apiHandler({
                methodName: 'getSetupStatus',
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
        const argsPresetLibraryController_listSettingsPresets: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                kind: {"in":"query","name":"kind","ref":"PresetKind"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/presets',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PresetLibraryController)),
            ...(fetchMiddlewares<RequestHandler>(PresetLibraryController.prototype.listSettingsPresets)),

            async function PresetLibraryController_listSettingsPresets(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPresetLibraryController_listSettingsPresets, request, response });

                const controller = new PresetLibraryController();

              await templateService.apiHandler({
                methodName: 'listSettingsPresets',
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
        const argsPresetLibraryController_createSettingsPreset: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateSettingsPresetRequest"},
        };
        app.post('/api/v1/presets',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PresetLibraryController)),
            ...(fetchMiddlewares<RequestHandler>(PresetLibraryController.prototype.createSettingsPreset)),

            async function PresetLibraryController_createSettingsPreset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPresetLibraryController_createSettingsPreset, request, response });

                const controller = new PresetLibraryController();

              await templateService.apiHandler({
                methodName: 'createSettingsPreset',
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
        const argsPresetLibraryController_getSettingsPreset: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                presetId: {"in":"path","name":"presetId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/presets/:presetId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PresetLibraryController)),
            ...(fetchMiddlewares<RequestHandler>(PresetLibraryController.prototype.getSettingsPreset)),

            async function PresetLibraryController_getSettingsPreset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPresetLibraryController_getSettingsPreset, request, response });

                const controller = new PresetLibraryController();

              await templateService.apiHandler({
                methodName: 'getSettingsPreset',
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
        const argsPresetLibraryController_updateSettingsPreset: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                presetId: {"in":"path","name":"presetId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateSettingsPresetRequest"},
        };
        app.put('/api/v1/presets/:presetId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PresetLibraryController)),
            ...(fetchMiddlewares<RequestHandler>(PresetLibraryController.prototype.updateSettingsPreset)),

            async function PresetLibraryController_updateSettingsPreset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPresetLibraryController_updateSettingsPreset, request, response });

                const controller = new PresetLibraryController();

              await templateService.apiHandler({
                methodName: 'updateSettingsPreset',
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
        const argsPresetLibraryController_deleteSettingsPreset: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                presetId: {"in":"path","name":"presetId","required":true,"ref":"Uuid"},
        };
        app.delete('/api/v1/presets/:presetId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PresetLibraryController)),
            ...(fetchMiddlewares<RequestHandler>(PresetLibraryController.prototype.deleteSettingsPreset)),

            async function PresetLibraryController_deleteSettingsPreset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPresetLibraryController_deleteSettingsPreset, request, response });

                const controller = new PresetLibraryController();

              await templateService.apiHandler({
                methodName: 'deleteSettingsPreset',
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
        const argsMeshtasticPresetController_exportMeshtasticPreset: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/meshtastic/preset',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticPresetController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticPresetController.prototype.exportMeshtasticPreset)),

            async function MeshtasticPresetController_exportMeshtasticPreset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticPresetController_exportMeshtasticPreset, request, response });

                const controller = new MeshtasticPresetController();

              await templateService.apiHandler({
                methodName: 'exportMeshtasticPreset',
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
        const argsMeshtasticPresetController_previewMeshtasticPreset: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"PreviewMeshtasticPresetRequest"},
        };
        app.post('/api/v1/events/:eventId/meshtastic/preset/preview',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticPresetController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticPresetController.prototype.previewMeshtasticPreset)),

            async function MeshtasticPresetController_previewMeshtasticPreset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticPresetController_previewMeshtasticPreset, request, response });

                const controller = new MeshtasticPresetController();

              await templateService.apiHandler({
                methodName: 'previewMeshtasticPreset',
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
        const argsMeshtasticPresetController_importMeshtasticPreset: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"ApplyMeshtasticPresetRequest"},
        };
        app.post('/api/v1/events/:eventId/meshtastic/preset/import',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticPresetController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticPresetController.prototype.importMeshtasticPreset)),

            async function MeshtasticPresetController_importMeshtasticPreset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticPresetController_importMeshtasticPreset, request, response });

                const controller = new MeshtasticPresetController();

              await templateService.apiHandler({
                methodName: 'importMeshtasticPreset',
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
        const argsTakPresetController_exportTakPreset: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/tak/preset',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakPresetController)),
            ...(fetchMiddlewares<RequestHandler>(TakPresetController.prototype.exportTakPreset)),

            async function TakPresetController_exportTakPreset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakPresetController_exportTakPreset, request, response });

                const controller = new TakPresetController();

              await templateService.apiHandler({
                methodName: 'exportTakPreset',
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
        const argsTakPresetController_previewTakPreset: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"PreviewTakPresetRequest"},
        };
        app.post('/api/v1/events/:eventId/tak/preset/preview',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakPresetController)),
            ...(fetchMiddlewares<RequestHandler>(TakPresetController.prototype.previewTakPreset)),

            async function TakPresetController_previewTakPreset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakPresetController_previewTakPreset, request, response });

                const controller = new TakPresetController();

              await templateService.apiHandler({
                methodName: 'previewTakPreset',
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
        const argsTakPresetController_importTakPreset: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"ApplyTakPresetRequest"},
        };
        app.post('/api/v1/events/:eventId/tak/preset/import',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TakPresetController)),
            ...(fetchMiddlewares<RequestHandler>(TakPresetController.prototype.importTakPreset)),

            async function TakPresetController_importTakPreset(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTakPresetController_importTakPreset, request, response });

                const controller = new TakPresetController();

              await templateService.apiHandler({
                methodName: 'importTakPreset',
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
        const argsServerLogsController_listServerLogs: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                after: {"in":"query","name":"after","dataType":"integer","validators":{"isInt":{"errorMsg":"after"},"minimum":{"value":0}}},
        };
        app.get('/api/v1/server-logs',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ServerLogsController)),
            ...(fetchMiddlewares<RequestHandler>(ServerLogsController.prototype.listServerLogs)),

            async function ServerLogsController_listServerLogs(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsServerLogsController_listServerLogs, request, response });

                const controller = new ServerLogsController();

              await templateService.apiHandler({
                methodName: 'listServerLogs',
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
        const argsRegistrationController_getRegistrationStatus: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/v1/registration',
            ...(fetchMiddlewares<RequestHandler>(RegistrationController)),
            ...(fetchMiddlewares<RequestHandler>(RegistrationController.prototype.getRegistrationStatus)),

            async function RegistrationController_getRegistrationStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRegistrationController_getRegistrationStatus, request, response });

                const controller = new RegistrationController();

              await templateService.apiHandler({
                methodName: 'getRegistrationStatus',
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
        const argsRegistrationController_register: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"RegisterRequest"},
        };
        app.post('/api/v1/registration',
            ...(fetchMiddlewares<RequestHandler>(RegistrationController)),
            ...(fetchMiddlewares<RequestHandler>(RegistrationController.prototype.register)),

            async function RegistrationController_register(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRegistrationController_register, request, response });

                const controller = new RegistrationController();

              await templateService.apiHandler({
                methodName: 'register',
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
        const argsRegistrationSettingsController_getRegistrationSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/registration-settings',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(RegistrationSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(RegistrationSettingsController.prototype.getRegistrationSettings)),

            async function RegistrationSettingsController_getRegistrationSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRegistrationSettingsController_getRegistrationSettings, request, response });

                const controller = new RegistrationSettingsController();

              await templateService.apiHandler({
                methodName: 'getRegistrationSettings',
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
        const argsRegistrationSettingsController_updateRegistrationSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateRegistrationSettingsRequest"},
        };
        app.put('/api/v1/registration-settings',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(RegistrationSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(RegistrationSettingsController.prototype.updateRegistrationSettings)),

            async function RegistrationSettingsController_updateRegistrationSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRegistrationSettingsController_updateRegistrationSettings, request, response });

                const controller = new RegistrationSettingsController();

              await templateService.apiHandler({
                methodName: 'updateRegistrationSettings',
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
        const argsRegistrationInvitesController_listRegistrationInvites: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/registration-invites',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(RegistrationInvitesController)),
            ...(fetchMiddlewares<RequestHandler>(RegistrationInvitesController.prototype.listRegistrationInvites)),

            async function RegistrationInvitesController_listRegistrationInvites(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRegistrationInvitesController_listRegistrationInvites, request, response });

                const controller = new RegistrationInvitesController();

              await templateService.apiHandler({
                methodName: 'listRegistrationInvites',
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
        const argsRegistrationInvitesController_createRegistrationInvite: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/v1/registration-invites',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(RegistrationInvitesController)),
            ...(fetchMiddlewares<RequestHandler>(RegistrationInvitesController.prototype.createRegistrationInvite)),

            async function RegistrationInvitesController_createRegistrationInvite(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRegistrationInvitesController_createRegistrationInvite, request, response });

                const controller = new RegistrationInvitesController();

              await templateService.apiHandler({
                methodName: 'createRegistrationInvite',
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
        const argsRegistrationInvitesController_revokeRegistrationInvite: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                inviteId: {"in":"path","name":"inviteId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/registration-invites/:inviteId/revoke',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(RegistrationInvitesController)),
            ...(fetchMiddlewares<RequestHandler>(RegistrationInvitesController.prototype.revokeRegistrationInvite)),

            async function RegistrationInvitesController_revokeRegistrationInvite(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRegistrationInvitesController_revokeRegistrationInvite, request, response });

                const controller = new RegistrationInvitesController();

              await templateService.apiHandler({
                methodName: 'revokeRegistrationInvite',
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
        const argsMemberProfileController_getMemberProfile: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                memberId: {"in":"path","name":"memberId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/members/:memberId/profile',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MemberProfileController)),
            ...(fetchMiddlewares<RequestHandler>(MemberProfileController.prototype.getMemberProfile)),

            async function MemberProfileController_getMemberProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMemberProfileController_getMemberProfile, request, response });

                const controller = new MemberProfileController();

              await templateService.apiHandler({
                methodName: 'getMemberProfile',
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
        const argsMyEventMembershipsController_listMyEventMemberships: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/me/event-memberships',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MyEventMembershipsController)),
            ...(fetchMiddlewares<RequestHandler>(MyEventMembershipsController.prototype.listMyEventMemberships)),

            async function MyEventMembershipsController_listMyEventMemberships(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMyEventMembershipsController_listMyEventMemberships, request, response });

                const controller = new MyEventMembershipsController();

              await templateService.apiHandler({
                methodName: 'listMyEventMemberships',
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
        const argsChannelHandoutsController_getChannelHandout: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                memberId: {"in":"path","name":"memberId","required":true,"ref":"Uuid"},
                channelId: {"in":"path","name":"channelId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/members/:memberId/meshtastic/channels/:channelId/handout',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ChannelHandoutsController)),
            ...(fetchMiddlewares<RequestHandler>(ChannelHandoutsController.prototype.getChannelHandout)),

            async function ChannelHandoutsController_getChannelHandout(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsChannelHandoutsController_getChannelHandout, request, response });

                const controller = new ChannelHandoutsController();

              await templateService.apiHandler({
                methodName: 'getChannelHandout',
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
        const argsOfflineSnapshotController_createOfflineSnapshot: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateOfflineSnapshotRequest"},
        };
        app.post('/api/v1/events/:eventId/offline-snapshots',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OfflineSnapshotController)),
            ...(fetchMiddlewares<RequestHandler>(OfflineSnapshotController.prototype.createOfflineSnapshot)),

            async function OfflineSnapshotController_createOfflineSnapshot(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOfflineSnapshotController_createOfflineSnapshot, request, response });

                const controller = new OfflineSnapshotController();

              await templateService.apiHandler({
                methodName: 'createOfflineSnapshot',
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
        const argsOfflineSnapshotController_listOfflineTiles: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                number: {"in":"path","name":"number","required":true,"dataType":"integer","validators":{"isInt":{"errorMsg":"number"},"minimum":{"value":1}}},
                contentId: {"in":"path","name":"contentId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/events/:eventId/offline-snapshots/packages/:packageId/revisions/:number/contents/:contentId/tiles',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OfflineSnapshotController)),
            ...(fetchMiddlewares<RequestHandler>(OfflineSnapshotController.prototype.listOfflineTiles)),

            async function OfflineSnapshotController_listOfflineTiles(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOfflineSnapshotController_listOfflineTiles, request, response });

                const controller = new OfflineSnapshotController();

              await templateService.apiHandler({
                methodName: 'listOfflineTiles',
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
        const argsOfflineSnapshotController_getOfflineImage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                number: {"in":"path","name":"number","required":true,"dataType":"integer","validators":{"isInt":{"errorMsg":"number"},"minimum":{"value":1}}},
                contentId: {"in":"path","name":"contentId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/offline-snapshots/packages/:packageId/revisions/:number/contents/:contentId/image',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OfflineSnapshotController)),
            ...(fetchMiddlewares<RequestHandler>(OfflineSnapshotController.prototype.getOfflineImage)),

            async function OfflineSnapshotController_getOfflineImage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOfflineSnapshotController_getOfflineImage, request, response });

                const controller = new OfflineSnapshotController();

              await templateService.apiHandler({
                methodName: 'getOfflineImage',
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
        const argsFirmwareReleasesController_listFirmwareReleases: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/meshtastic/firmware-releases',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(FirmwareReleasesController)),
            ...(fetchMiddlewares<RequestHandler>(FirmwareReleasesController.prototype.listFirmwareReleases)),

            async function FirmwareReleasesController_listFirmwareReleases(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFirmwareReleasesController_listFirmwareReleases, request, response });

                const controller = new FirmwareReleasesController();

              await templateService.apiHandler({
                methodName: 'listFirmwareReleases',
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
        const argsFirmwareReleasesController_getFirmwareReleaseSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/meshtastic/firmware-releases/settings',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(FirmwareReleasesController)),
            ...(fetchMiddlewares<RequestHandler>(FirmwareReleasesController.prototype.getFirmwareReleaseSettings)),

            async function FirmwareReleasesController_getFirmwareReleaseSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFirmwareReleasesController_getFirmwareReleaseSettings, request, response });

                const controller = new FirmwareReleasesController();

              await templateService.apiHandler({
                methodName: 'getFirmwareReleaseSettings',
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
        const argsFirmwareReleasesController_updateFirmwareReleaseSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateFirmwareReleaseSettingsRequest"},
        };
        app.put('/api/v1/meshtastic/firmware-releases/settings',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(FirmwareReleasesController)),
            ...(fetchMiddlewares<RequestHandler>(FirmwareReleasesController.prototype.updateFirmwareReleaseSettings)),

            async function FirmwareReleasesController_updateFirmwareReleaseSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFirmwareReleasesController_updateFirmwareReleaseSettings, request, response });

                const controller = new FirmwareReleasesController();

              await templateService.apiHandler({
                methodName: 'updateFirmwareReleaseSettings',
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
        const argsFirmwareProfilesController_listFirmwareProfiles: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/meshtastic/firmware-profiles',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(FirmwareProfilesController)),
            ...(fetchMiddlewares<RequestHandler>(FirmwareProfilesController.prototype.listFirmwareProfiles)),

            async function FirmwareProfilesController_listFirmwareProfiles(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFirmwareProfilesController_listFirmwareProfiles, request, response });

                const controller = new FirmwareProfilesController();

              await templateService.apiHandler({
                methodName: 'listFirmwareProfiles',
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
        const argsFirmwareProfilesController_getFirmwareProfile: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                profileId: {"in":"path","name":"profileId","required":true,"dataType":"string"},
        };
        app.get('/api/v1/meshtastic/firmware-profiles/:profileId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(FirmwareProfilesController)),
            ...(fetchMiddlewares<RequestHandler>(FirmwareProfilesController.prototype.getFirmwareProfile)),

            async function FirmwareProfilesController_getFirmwareProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsFirmwareProfilesController_getFirmwareProfile, request, response });

                const controller = new FirmwareProfilesController();

              await templateService.apiHandler({
                methodName: 'getFirmwareProfile',
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
        const argsMeshtasticConfigurationController_getMeshtasticConfiguration: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/meshtastic/configuration',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticConfigurationController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticConfigurationController.prototype.getMeshtasticConfiguration)),

            async function MeshtasticConfigurationController_getMeshtasticConfiguration(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticConfigurationController_getMeshtasticConfiguration, request, response });

                const controller = new MeshtasticConfigurationController();

              await templateService.apiHandler({
                methodName: 'getMeshtasticConfiguration',
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
        const argsMeshtasticConfigurationController_updateMeshtasticSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateMeshtasticSettingsRequest"},
        };
        app.put('/api/v1/events/:eventId/meshtastic/configuration/settings',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticConfigurationController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticConfigurationController.prototype.updateMeshtasticSettings)),

            async function MeshtasticConfigurationController_updateMeshtasticSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticConfigurationController_updateMeshtasticSettings, request, response });

                const controller = new MeshtasticConfigurationController();

              await templateService.apiHandler({
                methodName: 'updateMeshtasticSettings',
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
        const argsMeshtasticConfigurationController_updateMeshtasticSecrets: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateMeshtasticSecretsRequest"},
        };
        app.put('/api/v1/events/:eventId/meshtastic/configuration/secrets',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticConfigurationController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticConfigurationController.prototype.updateMeshtasticSecrets)),

            async function MeshtasticConfigurationController_updateMeshtasticSecrets(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticConfigurationController_updateMeshtasticSecrets, request, response });

                const controller = new MeshtasticConfigurationController();

              await templateService.apiHandler({
                methodName: 'updateMeshtasticSecrets',
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
        const argsMeshtasticConfigurationController_previewFirmwareChange: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"PreviewFirmwareChangeRequest"},
        };
        app.post('/api/v1/events/:eventId/meshtastic/configuration/firmware/preview',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticConfigurationController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticConfigurationController.prototype.previewFirmwareChange)),

            async function MeshtasticConfigurationController_previewFirmwareChange(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticConfigurationController_previewFirmwareChange, request, response });

                const controller = new MeshtasticConfigurationController();

              await templateService.apiHandler({
                methodName: 'previewFirmwareChange',
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
        const argsMeshtasticConfigurationController_changeFirmware: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"ChangeFirmwareRequest"},
        };
        app.put('/api/v1/events/:eventId/meshtastic/configuration/firmware',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticConfigurationController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticConfigurationController.prototype.changeFirmware)),

            async function MeshtasticConfigurationController_changeFirmware(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticConfigurationController_changeFirmware, request, response });

                const controller = new MeshtasticConfigurationController();

              await templateService.apiHandler({
                methodName: 'changeFirmware',
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
        const argsMeshtasticChannelsController_listMeshtasticChannels: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/events/:eventId/meshtastic/channels',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController.prototype.listMeshtasticChannels)),

            async function MeshtasticChannelsController_listMeshtasticChannels(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticChannelsController_listMeshtasticChannels, request, response });

                const controller = new MeshtasticChannelsController();

              await templateService.apiHandler({
                methodName: 'listMeshtasticChannels',
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
        const argsMeshtasticChannelsController_createMeshtasticChannel: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateMeshtasticChannelRequest"},
        };
        app.post('/api/v1/events/:eventId/meshtastic/channels',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController.prototype.createMeshtasticChannel)),

            async function MeshtasticChannelsController_createMeshtasticChannel(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticChannelsController_createMeshtasticChannel, request, response });

                const controller = new MeshtasticChannelsController();

              await templateService.apiHandler({
                methodName: 'createMeshtasticChannel',
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
        const argsMeshtasticChannelsController_getMeshtasticChannel: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                channelId: {"in":"path","name":"channelId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/meshtastic/channels/:channelId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController.prototype.getMeshtasticChannel)),

            async function MeshtasticChannelsController_getMeshtasticChannel(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticChannelsController_getMeshtasticChannel, request, response });

                const controller = new MeshtasticChannelsController();

              await templateService.apiHandler({
                methodName: 'getMeshtasticChannel',
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
        const argsMeshtasticChannelsController_updateMeshtasticChannel: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                channelId: {"in":"path","name":"channelId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateMeshtasticChannelRequest"},
        };
        app.put('/api/v1/events/:eventId/meshtastic/channels/:channelId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController.prototype.updateMeshtasticChannel)),

            async function MeshtasticChannelsController_updateMeshtasticChannel(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticChannelsController_updateMeshtasticChannel, request, response });

                const controller = new MeshtasticChannelsController();

              await templateService.apiHandler({
                methodName: 'updateMeshtasticChannel',
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
        const argsMeshtasticChannelsController_deleteMeshtasticChannel: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                channelId: {"in":"path","name":"channelId","required":true,"ref":"Uuid"},
        };
        app.delete('/api/v1/events/:eventId/meshtastic/channels/:channelId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController.prototype.deleteMeshtasticChannel)),

            async function MeshtasticChannelsController_deleteMeshtasticChannel(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticChannelsController_deleteMeshtasticChannel, request, response });

                const controller = new MeshtasticChannelsController();

              await templateService.apiHandler({
                methodName: 'deleteMeshtasticChannel',
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
        const argsMeshtasticChannelsController_rotateMeshtasticChannelPsk: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                channelId: {"in":"path","name":"channelId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"RotateChannelPskRequest"},
        };
        app.post('/api/v1/events/:eventId/meshtastic/channels/:channelId/psk/rotate',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController.prototype.rotateMeshtasticChannelPsk)),

            async function MeshtasticChannelsController_rotateMeshtasticChannelPsk(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticChannelsController_rotateMeshtasticChannelPsk, request, response });

                const controller = new MeshtasticChannelsController();

              await templateService.apiHandler({
                methodName: 'rotateMeshtasticChannelPsk',
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
        const argsMeshtasticChannelsController_releaseMeshtasticChannel: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                channelId: {"in":"path","name":"channelId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"ReleaseMeshtasticChannelRequest"},
        };
        app.post('/api/v1/events/:eventId/meshtastic/channels/:channelId/release',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController.prototype.releaseMeshtasticChannel)),

            async function MeshtasticChannelsController_releaseMeshtasticChannel(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticChannelsController_releaseMeshtasticChannel, request, response });

                const controller = new MeshtasticChannelsController();

              await templateService.apiHandler({
                methodName: 'releaseMeshtasticChannel',
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
        const argsMeshtasticChannelsController_revealMeshtasticChannelPsk: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                channelId: {"in":"path","name":"channelId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/events/:eventId/meshtastic/channels/:channelId/psk/reveal',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController)),
            ...(fetchMiddlewares<RequestHandler>(MeshtasticChannelsController.prototype.revealMeshtasticChannelPsk)),

            async function MeshtasticChannelsController_revealMeshtasticChannelPsk(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMeshtasticChannelsController_revealMeshtasticChannelPsk, request, response });

                const controller = new MeshtasticChannelsController();

              await templateService.apiHandler({
                methodName: 'revealMeshtasticChannelPsk',
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
        const argsDeviceProfileController_getMeshtasticDeviceProfile: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                memberId: {"in":"path","name":"memberId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/members/:memberId/meshtastic/device-profile',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DeviceProfileController)),
            ...(fetchMiddlewares<RequestHandler>(DeviceProfileController.prototype.getMeshtasticDeviceProfile)),

            async function DeviceProfileController_getMeshtasticDeviceProfile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDeviceProfileController_getMeshtasticDeviceProfile, request, response });

                const controller = new DeviceProfileController();

              await templateService.apiHandler({
                methodName: 'getMeshtasticDeviceProfile',
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
        const argsMemberDataPackagesController_listMemberDataPackages: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                memberId: {"in":"path","name":"memberId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/members/:memberId/data-packages',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MemberDataPackagesController)),
            ...(fetchMiddlewares<RequestHandler>(MemberDataPackagesController.prototype.listMemberDataPackages)),

            async function MemberDataPackagesController_listMemberDataPackages(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMemberDataPackagesController_listMemberDataPackages, request, response });

                const controller = new MemberDataPackagesController();

              await templateService.apiHandler({
                methodName: 'listMemberDataPackages',
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
        const argsMemberDataPackagesController_downloadMemberDataPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                memberId: {"in":"path","name":"memberId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/members/:memberId/data-packages/:packageId/atak',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MemberDataPackagesController)),
            ...(fetchMiddlewares<RequestHandler>(MemberDataPackagesController.prototype.downloadMemberDataPackage)),

            async function MemberDataPackagesController_downloadMemberDataPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMemberDataPackagesController_downloadMemberDataPackage, request, response });

                const controller = new MemberDataPackagesController();

              await templateService.apiHandler({
                methodName: 'downloadMemberDataPackage',
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
        const argsMapSettingsController_getMapSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/map/settings',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MapSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(MapSettingsController.prototype.getMapSettings)),

            async function MapSettingsController_getMapSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMapSettingsController_getMapSettings, request, response });

                const controller = new MapSettingsController();

              await templateService.apiHandler({
                methodName: 'getMapSettings',
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
        const argsMapSettingsController_updateMapSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateMapSettingsRequest"},
        };
        app.put('/api/v1/map/settings',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(MapSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(MapSettingsController.prototype.updateMapSettings)),

            async function MapSettingsController_updateMapSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMapSettingsController_updateMapSettings, request, response });

                const controller = new MapSettingsController();

              await templateService.apiHandler({
                methodName: 'updateMapSettings',
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
        const argsInstanceSettingsController_getInstanceSettings: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/v1/instance',
            ...(fetchMiddlewares<RequestHandler>(InstanceSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(InstanceSettingsController.prototype.getInstanceSettings)),

            async function InstanceSettingsController_getInstanceSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInstanceSettingsController_getInstanceSettings, request, response });

                const controller = new InstanceSettingsController();

              await templateService.apiHandler({
                methodName: 'getInstanceSettings',
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
        const argsInstanceSettingsController_updateInstanceSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateInstanceSettingsRequest"},
        };
        app.put('/api/v1/instance',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(InstanceSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(InstanceSettingsController.prototype.updateInstanceSettings)),

            async function InstanceSettingsController_updateInstanceSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsInstanceSettingsController_updateInstanceSettings, request, response });

                const controller = new InstanceSettingsController();

              await templateService.apiHandler({
                methodName: 'updateInstanceSettings',
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
        const argsIconSettingsController_getIconSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/map/icons/settings',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(IconSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(IconSettingsController.prototype.getIconSettings)),

            async function IconSettingsController_getIconSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIconSettingsController_getIconSettings, request, response });

                const controller = new IconSettingsController();

              await templateService.apiHandler({
                methodName: 'getIconSettings',
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
        const argsIconSettingsController_updateIconSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                version: {"in":"query","name":"version","required":true,"dataType":"integer","validators":{"isInt":{"errorMsg":"version"},"minimum":{"value":0}}},
        };
        app.put('/api/v1/map/icons/settings',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(IconSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(IconSettingsController.prototype.updateIconSettings)),

            async function IconSettingsController_updateIconSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIconSettingsController_updateIconSettings, request, response });

                const controller = new IconSettingsController();

              await templateService.apiHandler({
                methodName: 'updateIconSettings',
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
        const argsIconSettingsController_clearSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                version: {"in":"query","name":"version","required":true,"dataType":"integer","validators":{"isInt":{"errorMsg":"version"},"minimum":{"value":0}}},
        };
        app.delete('/api/v1/map/icons/settings',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(IconSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(IconSettingsController.prototype.clearSettings)),

            async function IconSettingsController_clearSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIconSettingsController_clearSettings, request, response });

                const controller = new IconSettingsController();

              await templateService.apiHandler({
                methodName: 'clearSettings',
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
        const argsIconSettingsController_getCatalogue: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/map/icons',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(IconSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(IconSettingsController.prototype.getCatalogue)),

            async function IconSettingsController_getCatalogue(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIconSettingsController_getCatalogue, request, response });

                const controller = new IconSettingsController();

              await templateService.apiHandler({
                methodName: 'getCatalogue',
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
        const argsIconSettingsController_getImage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                version: {"in":"path","name":"version","required":true,"dataType":"integer","validators":{"isInt":{"errorMsg":"version"},"minimum":{"value":1}}},
                iconId: {"in":"path","name":"iconId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/map/icons/:version/:iconId/image',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(IconSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(IconSettingsController.prototype.getImage)),

            async function IconSettingsController_getImage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIconSettingsController_getImage, request, response });

                const controller = new IconSettingsController();

              await templateService.apiHandler({
                methodName: 'getImage',
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
                _idempotencyKey: {"in":"header","name":"Idempotency-Key","dataType":"string"},
        };
        app.post('/api/v1/events',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
        const argsEventsController_makeEventAccountsPermanent: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/events/:eventId/make-accounts-permanent',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventsController)),
            ...(fetchMiddlewares<RequestHandler>(EventsController.prototype.makeEventAccountsPermanent)),

            async function EventsController_makeEventAccountsPermanent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventsController_makeEventAccountsPermanent, request, response });

                const controller = new EventsController();

              await templateService.apiHandler({
                methodName: 'makeEventAccountsPermanent',
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
                _idempotencyKey: {"in":"header","name":"Idempotency-Key","dataType":"string"},
        };
        app.post('/api/v1/events/:eventId/roles',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
        const argsGroupMemberOrderController_reorderGroupMembers: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                groupId: {"in":"path","name":"groupId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"ReorderGroupMembersRequest"},
        };
        app.put('/api/v1/events/:eventId/groups/:groupId/member-order',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(GroupMemberOrderController)),
            ...(fetchMiddlewares<RequestHandler>(GroupMemberOrderController.prototype.reorderGroupMembers)),

            async function GroupMemberOrderController_reorderGroupMembers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsGroupMemberOrderController_reorderGroupMembers, request, response });

                const controller = new GroupMemberOrderController();

              await templateService.apiHandler({
                methodName: 'reorderGroupMembers',
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
        const argsEventMembersController_createEventMember: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateEventMemberRequest"},
                _idempotencyKey: {"in":"header","name":"Idempotency-Key","dataType":"string"},
        };
        app.post('/api/v1/events/:eventId/members',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventMembersController)),
            ...(fetchMiddlewares<RequestHandler>(EventMembersController.prototype.createEventMember)),

            async function EventMembersController_createEventMember(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventMembersController_createEventMember, request, response });

                const controller = new EventMembersController();

              await templateService.apiHandler({
                methodName: 'createEventMember',
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
        const argsEventMembersController_createEventMemberAccount: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateEventMemberAccountRequest"},
        };
        app.post('/api/v1/events/:eventId/members/accounts',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventMembersController)),
            ...(fetchMiddlewares<RequestHandler>(EventMembersController.prototype.createEventMemberAccount)),

            async function EventMembersController_createEventMemberAccount(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventMembersController_createEventMemberAccount, request, response });

                const controller = new EventMembersController();

              await templateService.apiHandler({
                methodName: 'createEventMemberAccount',
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
        const argsEventMembersController_getEventMember: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                memberId: {"in":"path","name":"memberId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/members/:memberId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
        const argsEventMembersController_updateEventMember: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                memberId: {"in":"path","name":"memberId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateEventMemberRequest"},
        };
        app.put('/api/v1/events/:eventId/members/:memberId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EventMembersController)),
            ...(fetchMiddlewares<RequestHandler>(EventMembersController.prototype.updateEventMember)),

            async function EventMembersController_updateEventMember(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEventMembersController_updateEventMember, request, response });

                const controller = new EventMembersController();

              await templateService.apiHandler({
                methodName: 'updateEventMember',
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
                _idempotencyKey: {"in":"header","name":"Idempotency-Key","dataType":"string"},
        };
        app.post('/api/v1/events/:eventId/groups',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
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
        const argsConfigurationRevisionsController_listConfigurationRevisions: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/events/:eventId/configuration-revisions',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ConfigurationRevisionsController)),
            ...(fetchMiddlewares<RequestHandler>(ConfigurationRevisionsController.prototype.listConfigurationRevisions)),

            async function ConfigurationRevisionsController_listConfigurationRevisions(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsConfigurationRevisionsController_listConfigurationRevisions, request, response });

                const controller = new ConfigurationRevisionsController();

              await templateService.apiHandler({
                methodName: 'listConfigurationRevisions',
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
        const argsConfigurationRevisionsController_publishConfiguration: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                _idempotencyKey: {"in":"header","name":"Idempotency-Key","dataType":"string"},
        };
        app.post('/api/v1/events/:eventId/configuration-revisions',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ConfigurationRevisionsController)),
            ...(fetchMiddlewares<RequestHandler>(ConfigurationRevisionsController.prototype.publishConfiguration)),

            async function ConfigurationRevisionsController_publishConfiguration(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsConfigurationRevisionsController_publishConfiguration, request, response });

                const controller = new ConfigurationRevisionsController();

              await templateService.apiHandler({
                methodName: 'publishConfiguration',
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
        const argsConfigurationRevisionsController_getPendingConfigurationChanges: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/configuration-revisions/pending-changes',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ConfigurationRevisionsController)),
            ...(fetchMiddlewares<RequestHandler>(ConfigurationRevisionsController.prototype.getPendingConfigurationChanges)),

            async function ConfigurationRevisionsController_getPendingConfigurationChanges(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsConfigurationRevisionsController_getPendingConfigurationChanges, request, response });

                const controller = new ConfigurationRevisionsController();

              await templateService.apiHandler({
                methodName: 'getPendingConfigurationChanges',
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
        const argsConfigurationRevisionsController_getConfigurationRevision: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                revisionId: {"in":"path","name":"revisionId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/configuration-revisions/:revisionId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ConfigurationRevisionsController)),
            ...(fetchMiddlewares<RequestHandler>(ConfigurationRevisionsController.prototype.getConfigurationRevision)),

            async function ConfigurationRevisionsController_getConfigurationRevision(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsConfigurationRevisionsController_getConfigurationRevision, request, response });

                const controller = new ConfigurationRevisionsController();

              await templateService.apiHandler({
                methodName: 'getConfigurationRevision',
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
        const argsEmailSettingsController_getEmailSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/v1/email/settings',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EmailSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(EmailSettingsController.prototype.getEmailSettings)),

            async function EmailSettingsController_getEmailSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEmailSettingsController_getEmailSettings, request, response });

                const controller = new EmailSettingsController();

              await templateService.apiHandler({
                methodName: 'getEmailSettings',
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
        const argsEmailSettingsController_updateEmailSettings: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateEmailSettingsRequest"},
        };
        app.put('/api/v1/email/settings',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EmailSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(EmailSettingsController.prototype.updateEmailSettings)),

            async function EmailSettingsController_updateEmailSettings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEmailSettingsController_updateEmailSettings, request, response });

                const controller = new EmailSettingsController();

              await templateService.apiHandler({
                methodName: 'updateEmailSettings',
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
        const argsEmailSettingsController_sendTestEmail: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"SendTestEmailRequest"},
        };
        app.post('/api/v1/email/settings/test',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(EmailSettingsController)),
            ...(fetchMiddlewares<RequestHandler>(EmailSettingsController.prototype.sendTestEmail)),

            async function EmailSettingsController_sendTestEmail(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsEmailSettingsController_sendTestEmail, request, response });

                const controller = new EmailSettingsController();

              await templateService.apiHandler({
                methodName: 'sendTestEmail',
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
        const argsDownloadGrantsController_createDownloadGrant: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateDownloadGrantRequest"},
        };
        app.post('/api/v1/me/download-grants',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DownloadGrantsController)),
            ...(fetchMiddlewares<RequestHandler>(DownloadGrantsController.prototype.createDownloadGrant)),

            async function DownloadGrantsController_createDownloadGrant(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDownloadGrantsController_createDownloadGrant, request, response });

                const controller = new DownloadGrantsController();

              await templateService.apiHandler({
                methodName: 'createDownloadGrant',
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
        const argsGrantedDownloadsController_downloadWithGrant: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                token: {"in":"path","name":"token","required":true,"dataType":"string"},
        };
        app.get('/api/v1/downloads/:token',
            ...(fetchMiddlewares<RequestHandler>(GrantedDownloadsController)),
            ...(fetchMiddlewares<RequestHandler>(GrantedDownloadsController.prototype.downloadWithGrant)),

            async function GrantedDownloadsController_downloadWithGrant(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsGrantedDownloadsController_downloadWithGrant, request, response });

                const controller = new GrantedDownloadsController();

              await templateService.apiHandler({
                methodName: 'downloadWithGrant',
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
        const argsPackageRevisionsController_listPackageRevisions: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/revisions',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageRevisionsController)),
            ...(fetchMiddlewares<RequestHandler>(PackageRevisionsController.prototype.listPackageRevisions)),

            async function PackageRevisionsController_listPackageRevisions(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageRevisionsController_listPackageRevisions, request, response });

                const controller = new PackageRevisionsController();

              await templateService.apiHandler({
                methodName: 'listPackageRevisions',
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
        const argsPackageRevisionsController_publishDataPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                _idempotencyKey: {"in":"header","name":"Idempotency-Key","dataType":"string"},
        };
        app.post('/api/v1/events/:eventId/data-packages/:packageId/revisions',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageRevisionsController)),
            ...(fetchMiddlewares<RequestHandler>(PackageRevisionsController.prototype.publishDataPackage)),

            async function PackageRevisionsController_publishDataPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageRevisionsController_publishDataPackage, request, response });

                const controller = new PackageRevisionsController();

              await templateService.apiHandler({
                methodName: 'publishDataPackage',
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
        const argsPackageRevisionsController_getPackageRevision: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                number: {"in":"path","name":"number","required":true,"dataType":"integer","validators":{"isInt":{"errorMsg":"number"},"minimum":{"value":1}}},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/revisions/:number',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageRevisionsController)),
            ...(fetchMiddlewares<RequestHandler>(PackageRevisionsController.prototype.getPackageRevision)),

            async function PackageRevisionsController_getPackageRevision(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageRevisionsController_getPackageRevision, request, response });

                const controller = new PackageRevisionsController();

              await templateService.apiHandler({
                methodName: 'getPackageRevision',
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
        const argsPackagePresentationController_report: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                format: {"in":"query","name":"format","required":true,"dataType":"union","subSchemas":[{"dataType":"enum","enums":["cot"]},{"dataType":"enum","enums":["kml"]}]},
                revision: {"in":"query","name":"revision","dataType":"integer","validators":{"isInt":{"errorMsg":"revision"},"minimum":{"value":1}}},
                layerId: {"in":"query","name":"layerId","ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/presentation-report',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackagePresentationController)),
            ...(fetchMiddlewares<RequestHandler>(PackagePresentationController.prototype.report)),

            async function PackagePresentationController_report(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackagePresentationController_report, request, response });

                const controller = new PackagePresentationController();

              await templateService.apiHandler({
                methodName: 'report',
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
        const argsPackageOrderController_reorderDataPackages: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"ReorderDataPackagesRequest"},
        };
        app.put('/api/v1/events/:eventId/data-package-order',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageOrderController)),
            ...(fetchMiddlewares<RequestHandler>(PackageOrderController.prototype.reorderDataPackages)),

            async function PackageOrderController_reorderDataPackages(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageOrderController_reorderDataPackages, request, response });

                const controller = new PackageOrderController();

              await templateService.apiHandler({
                methodName: 'reorderDataPackages',
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
        const argsPackageObjectsController_batchPackageObjects: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"BatchPackageObjectsRequest"},
                _idempotencyKey: {"in":"header","name":"Idempotency-Key","dataType":"string"},
        };
        app.post('/api/v1/events/:eventId/data-packages/:packageId/objects/batch',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageObjectsController)),
            ...(fetchMiddlewares<RequestHandler>(PackageObjectsController.prototype.batchPackageObjects)),

            async function PackageObjectsController_batchPackageObjects(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageObjectsController_batchPackageObjects, request, response });

                const controller = new PackageObjectsController();

              await templateService.apiHandler({
                methodName: 'batchPackageObjects',
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
        const argsPackageObjectsController_listPackageObjects: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                layerId: {"in":"query","name":"layerId","ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/objects',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageObjectsController)),
            ...(fetchMiddlewares<RequestHandler>(PackageObjectsController.prototype.listPackageObjects)),

            async function PackageObjectsController_listPackageObjects(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageObjectsController_listPackageObjects, request, response });

                const controller = new PackageObjectsController();

              await templateService.apiHandler({
                methodName: 'listPackageObjects',
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
        const argsPackageObjectsController_createPackageObject: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreatePackageObjectRequest"},
                _idempotencyKey: {"in":"header","name":"Idempotency-Key","dataType":"string"},
        };
        app.post('/api/v1/events/:eventId/data-packages/:packageId/objects',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageObjectsController)),
            ...(fetchMiddlewares<RequestHandler>(PackageObjectsController.prototype.createPackageObject)),

            async function PackageObjectsController_createPackageObject(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageObjectsController_createPackageObject, request, response });

                const controller = new PackageObjectsController();

              await templateService.apiHandler({
                methodName: 'createPackageObject',
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
        const argsPackageObjectsController_getPackageObject: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                objectId: {"in":"path","name":"objectId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/objects/:objectId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageObjectsController)),
            ...(fetchMiddlewares<RequestHandler>(PackageObjectsController.prototype.getPackageObject)),

            async function PackageObjectsController_getPackageObject(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageObjectsController_getPackageObject, request, response });

                const controller = new PackageObjectsController();

              await templateService.apiHandler({
                methodName: 'getPackageObject',
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
        const argsPackageObjectsController_updatePackageObject: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                objectId: {"in":"path","name":"objectId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdatePackageObjectRequest"},
        };
        app.put('/api/v1/events/:eventId/data-packages/:packageId/objects/:objectId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageObjectsController)),
            ...(fetchMiddlewares<RequestHandler>(PackageObjectsController.prototype.updatePackageObject)),

            async function PackageObjectsController_updatePackageObject(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageObjectsController_updatePackageObject, request, response });

                const controller = new PackageObjectsController();

              await templateService.apiHandler({
                methodName: 'updatePackageObject',
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
        const argsPackageObjectsController_deletePackageObject: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                objectId: {"in":"path","name":"objectId","required":true,"ref":"Uuid"},
        };
        app.delete('/api/v1/events/:eventId/data-packages/:packageId/objects/:objectId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageObjectsController)),
            ...(fetchMiddlewares<RequestHandler>(PackageObjectsController.prototype.deletePackageObject)),

            async function PackageObjectsController_deletePackageObject(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageObjectsController_deletePackageObject, request, response });

                const controller = new PackageObjectsController();

              await templateService.apiHandler({
                methodName: 'deletePackageObject',
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
        const argsPackageNewImportController_importAtakAsNewPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                fileName: {"in":"query","name":"fileName","dataType":"string","validators":{"maxLength":{"value":255}}},
        };
        app.post('/api/v1/events/:eventId/data-package-imports/atak',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageNewImportController)),
            ...(fetchMiddlewares<RequestHandler>(PackageNewImportController.prototype.importAtakAsNewPackage)),

            async function PackageNewImportController_importAtakAsNewPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageNewImportController_importAtakAsNewPackage, request, response });

                const controller = new PackageNewImportController();

              await templateService.apiHandler({
                methodName: 'importAtakAsNewPackage',
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
        const argsPackageLayersController_listPackageLayers: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/layers',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageLayersController)),
            ...(fetchMiddlewares<RequestHandler>(PackageLayersController.prototype.listPackageLayers)),

            async function PackageLayersController_listPackageLayers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageLayersController_listPackageLayers, request, response });

                const controller = new PackageLayersController();

              await templateService.apiHandler({
                methodName: 'listPackageLayers',
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
        const argsPackageLayersController_createPackageLayer: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreatePackageLayerRequest"},
                _idempotencyKey: {"in":"header","name":"Idempotency-Key","dataType":"string"},
        };
        app.post('/api/v1/events/:eventId/data-packages/:packageId/layers',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageLayersController)),
            ...(fetchMiddlewares<RequestHandler>(PackageLayersController.prototype.createPackageLayer)),

            async function PackageLayersController_createPackageLayer(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageLayersController_createPackageLayer, request, response });

                const controller = new PackageLayersController();

              await templateService.apiHandler({
                methodName: 'createPackageLayer',
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
        const argsPackageLayersController_updatePackageLayer: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                layerId: {"in":"path","name":"layerId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdatePackageLayerRequest"},
        };
        app.put('/api/v1/events/:eventId/data-packages/:packageId/layers/:layerId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageLayersController)),
            ...(fetchMiddlewares<RequestHandler>(PackageLayersController.prototype.updatePackageLayer)),

            async function PackageLayersController_updatePackageLayer(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageLayersController_updatePackageLayer, request, response });

                const controller = new PackageLayersController();

              await templateService.apiHandler({
                methodName: 'updatePackageLayer',
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
        const argsPackageLayersController_deletePackageLayer: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                layerId: {"in":"path","name":"layerId","required":true,"ref":"Uuid"},
        };
        app.delete('/api/v1/events/:eventId/data-packages/:packageId/layers/:layerId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageLayersController)),
            ...(fetchMiddlewares<RequestHandler>(PackageLayersController.prototype.deletePackageLayer)),

            async function PackageLayersController_deletePackageLayer(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageLayersController_deletePackageLayer, request, response });

                const controller = new PackageLayersController();

              await templateService.apiHandler({
                methodName: 'deletePackageLayer',
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
        const argsPackageKmlController_exportPackageDraftKml: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                layerId: {"in":"query","name":"layerId","ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/kml',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageKmlController)),
            ...(fetchMiddlewares<RequestHandler>(PackageKmlController.prototype.exportPackageDraftKml)),

            async function PackageKmlController_exportPackageDraftKml(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageKmlController_exportPackageDraftKml, request, response });

                const controller = new PackageKmlController();

              await templateService.apiHandler({
                methodName: 'exportPackageDraftKml',
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
        const argsPackageKmlController_exportPackageRevisionKml: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                number: {"in":"path","name":"number","required":true,"dataType":"integer","validators":{"isInt":{"errorMsg":"number"},"minimum":{"value":1}}},
                layerId: {"in":"query","name":"layerId","ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/revisions/:number/kml',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageKmlController)),
            ...(fetchMiddlewares<RequestHandler>(PackageKmlController.prototype.exportPackageRevisionKml)),

            async function PackageKmlController_exportPackageRevisionKml(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageKmlController_exportPackageRevisionKml, request, response });

                const controller = new PackageKmlController();

              await templateService.apiHandler({
                methodName: 'exportPackageRevisionKml',
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
        const argsPackageGeoJsonController_importPackageGeoJson: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                layerId: {"in":"path","name":"layerId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"GeoJsonDocument"},
        };
        app.post('/api/v1/events/:eventId/data-packages/:packageId/layers/:layerId/import',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageGeoJsonController)),
            ...(fetchMiddlewares<RequestHandler>(PackageGeoJsonController.prototype.importPackageGeoJson)),

            async function PackageGeoJsonController_importPackageGeoJson(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageGeoJsonController_importPackageGeoJson, request, response });

                const controller = new PackageGeoJsonController();

              await templateService.apiHandler({
                methodName: 'importPackageGeoJson',
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
        const argsPackageGeoJsonController_exportPackageDraftGeoJson: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                layerId: {"in":"query","name":"layerId","ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/geojson',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageGeoJsonController)),
            ...(fetchMiddlewares<RequestHandler>(PackageGeoJsonController.prototype.exportPackageDraftGeoJson)),

            async function PackageGeoJsonController_exportPackageDraftGeoJson(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageGeoJsonController_exportPackageDraftGeoJson, request, response });

                const controller = new PackageGeoJsonController();

              await templateService.apiHandler({
                methodName: 'exportPackageDraftGeoJson',
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
        const argsPackageGeoJsonController_exportPackageRevisionGeoJson: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                number: {"in":"path","name":"number","required":true,"dataType":"integer","validators":{"isInt":{"errorMsg":"number"},"minimum":{"value":1}}},
                layerId: {"in":"query","name":"layerId","ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/revisions/:number/geojson',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageGeoJsonController)),
            ...(fetchMiddlewares<RequestHandler>(PackageGeoJsonController.prototype.exportPackageRevisionGeoJson)),

            async function PackageGeoJsonController_exportPackageRevisionGeoJson(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageGeoJsonController_exportPackageRevisionGeoJson, request, response });

                const controller = new PackageGeoJsonController();

              await templateService.apiHandler({
                methodName: 'exportPackageRevisionGeoJson',
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
        const argsPackageCopyController_createDataPackageCopy: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateDataPackageCopyRequest"},
                _idempotencyKey: {"in":"header","name":"Idempotency-Key","dataType":"string"},
        };
        app.post('/api/v1/events/:eventId/data-package-copies',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageCopyController)),
            ...(fetchMiddlewares<RequestHandler>(PackageCopyController.prototype.createDataPackageCopy)),

            async function PackageCopyController_createDataPackageCopy(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageCopyController_createDataPackageCopy, request, response });

                const controller = new PackageCopyController();

              await templateService.apiHandler({
                methodName: 'createDataPackageCopy',
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
        const argsPackageContentController_listPackageContents: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/contents',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageContentController)),
            ...(fetchMiddlewares<RequestHandler>(PackageContentController.prototype.listPackageContents)),

            async function PackageContentController_listPackageContents(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageContentController_listPackageContents, request, response });

                const controller = new PackageContentController();

              await templateService.apiHandler({
                methodName: 'listPackageContents',
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
        const argsPackageContentController_getOfflineMapTile: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                contentId: {"in":"path","name":"contentId","required":true,"ref":"Uuid"},
                z: {"in":"path","name":"z","required":true,"dataType":"integer","validators":{"isInt":{"errorMsg":"z"},"minimum":{"value":0},"maximum":{"value":24}}},
                x: {"in":"path","name":"x","required":true,"dataType":"integer","validators":{"isInt":{"errorMsg":"x"},"minimum":{"value":0}}},
                y: {"in":"path","name":"y","required":true,"dataType":"integer","validators":{"isInt":{"errorMsg":"y"},"minimum":{"value":0}}},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/contents/:contentId/tiles/:z/:x/:y',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageContentController)),
            ...(fetchMiddlewares<RequestHandler>(PackageContentController.prototype.getOfflineMapTile)),

            async function PackageContentController_getOfflineMapTile(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageContentController_getOfflineMapTile, request, response });

                const controller = new PackageContentController();

              await templateService.apiHandler({
                methodName: 'getOfflineMapTile',
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
        const argsPackageContentController_getRubberSheetImage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                contentId: {"in":"path","name":"contentId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/contents/:contentId/image',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageContentController)),
            ...(fetchMiddlewares<RequestHandler>(PackageContentController.prototype.getRubberSheetImage)),

            async function PackageContentController_getRubberSheetImage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageContentController_getRubberSheetImage, request, response });

                const controller = new PackageContentController();

              await templateService.apiHandler({
                methodName: 'getRubberSheetImage',
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
        const argsPackageContentController_updatePackageContent: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                contentId: {"in":"path","name":"contentId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdatePackageContentRequest"},
        };
        app.put('/api/v1/events/:eventId/data-packages/:packageId/contents/:contentId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageContentController)),
            ...(fetchMiddlewares<RequestHandler>(PackageContentController.prototype.updatePackageContent)),

            async function PackageContentController_updatePackageContent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageContentController_updatePackageContent, request, response });

                const controller = new PackageContentController();

              await templateService.apiHandler({
                methodName: 'updatePackageContent',
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
        const argsPackageContentController_deletePackageContent: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                contentId: {"in":"path","name":"contentId","required":true,"ref":"Uuid"},
        };
        app.delete('/api/v1/events/:eventId/data-packages/:packageId/contents/:contentId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageContentController)),
            ...(fetchMiddlewares<RequestHandler>(PackageContentController.prototype.deletePackageContent)),

            async function PackageContentController_deletePackageContent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageContentController_deletePackageContent, request, response });

                const controller = new PackageContentController();

              await templateService.apiHandler({
                methodName: 'deletePackageContent',
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
        const argsPackageAtakController_importAtakDataPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                layerId: {"in":"path","name":"layerId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/events/:eventId/data-packages/:packageId/layers/:layerId/import/atak',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageAtakController)),
            ...(fetchMiddlewares<RequestHandler>(PackageAtakController.prototype.importAtakDataPackage)),

            async function PackageAtakController_importAtakDataPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageAtakController_importAtakDataPackage, request, response });

                const controller = new PackageAtakController();

              await templateService.apiHandler({
                methodName: 'importAtakDataPackage',
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
        const argsPackageAtakController_exportAtakDataPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                number: {"in":"path","name":"number","required":true,"dataType":"integer","validators":{"isInt":{"errorMsg":"number"},"minimum":{"value":1}}},
                layerId: {"in":"query","name":"layerId","ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/revisions/:number/atak',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PackageAtakController)),
            ...(fetchMiddlewares<RequestHandler>(PackageAtakController.prototype.exportAtakDataPackage)),

            async function PackageAtakController_exportAtakDataPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPackageAtakController_exportAtakDataPackage, request, response });

                const controller = new PackageAtakController();

              await templateService.apiHandler({
                methodName: 'exportAtakDataPackage',
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
        const argsIconLibraryController_importPackageIcons: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                layerId: {"in":"path","name":"layerId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/events/:eventId/data-packages/:packageId/layers/:layerId/import/icons',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(IconLibraryController)),
            ...(fetchMiddlewares<RequestHandler>(IconLibraryController.prototype.importPackageIcons)),

            async function IconLibraryController_importPackageIcons(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIconLibraryController_importPackageIcons, request, response });

                const controller = new IconLibraryController();

              await templateService.apiHandler({
                methodName: 'importPackageIcons',
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
        const argsIconLibraryController_listIcons: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                contentId: {"in":"path","name":"contentId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/contents/:contentId/icons',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(IconLibraryController)),
            ...(fetchMiddlewares<RequestHandler>(IconLibraryController.prototype.listIcons)),

            async function IconLibraryController_listIcons(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIconLibraryController_listIcons, request, response });

                const controller = new IconLibraryController();

              await templateService.apiHandler({
                methodName: 'listIcons',
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
        const argsIconLibraryController_getIconImage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                contentId: {"in":"path","name":"contentId","required":true,"ref":"Uuid"},
                iconId: {"in":"path","name":"iconId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId/contents/:contentId/icons/:iconId/image',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(IconLibraryController)),
            ...(fetchMiddlewares<RequestHandler>(IconLibraryController.prototype.getIconImage)),

            async function IconLibraryController_getIconImage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsIconLibraryController_getIconImage, request, response });

                const controller = new IconLibraryController();

              await templateService.apiHandler({
                methodName: 'getIconImage',
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
        const argsDataPackagesController_listDataPackages: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
                kind: {"in":"query","name":"kind","ref":"DataPackageKind"},
        };
        app.get('/api/v1/events/:eventId/data-packages',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController)),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController.prototype.listDataPackages)),

            async function DataPackagesController_listDataPackages(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDataPackagesController_listDataPackages, request, response });

                const controller = new DataPackagesController();

              await templateService.apiHandler({
                methodName: 'listDataPackages',
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
        const argsDataPackagesController_createDataPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateDataPackageRequest"},
                _idempotencyKey: {"in":"header","name":"Idempotency-Key","dataType":"string"},
        };
        app.post('/api/v1/events/:eventId/data-packages',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController)),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController.prototype.createDataPackage)),

            async function DataPackagesController_createDataPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDataPackagesController_createDataPackage, request, response });

                const controller = new DataPackagesController();

              await templateService.apiHandler({
                methodName: 'createDataPackage',
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
        const argsDataPackagesController_getDataPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/events/:eventId/data-packages/:packageId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController)),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController.prototype.getDataPackage)),

            async function DataPackagesController_getDataPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDataPackagesController_getDataPackage, request, response });

                const controller = new DataPackagesController();

              await templateService.apiHandler({
                methodName: 'getDataPackage',
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
        const argsDataPackagesController_updateDataPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateDataPackageRequest"},
        };
        app.put('/api/v1/events/:eventId/data-packages/:packageId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController)),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController.prototype.updateDataPackage)),

            async function DataPackagesController_updateDataPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDataPackagesController_updateDataPackage, request, response });

                const controller = new DataPackagesController();

              await templateService.apiHandler({
                methodName: 'updateDataPackage',
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
        const argsDataPackagesController_deleteDataPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
        };
        app.delete('/api/v1/events/:eventId/data-packages/:packageId',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController)),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController.prototype.deleteDataPackage)),

            async function DataPackagesController_deleteDataPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDataPackagesController_deleteDataPackage, request, response });

                const controller = new DataPackagesController();

              await templateService.apiHandler({
                methodName: 'deleteDataPackage',
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
        const argsDataPackagesController_updateDataPackageAudience: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdatePackageAudienceRequest"},
        };
        app.put('/api/v1/events/:eventId/data-packages/:packageId/audience',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController)),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController.prototype.updateDataPackageAudience)),

            async function DataPackagesController_updateDataPackageAudience(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDataPackagesController_updateDataPackageAudience, request, response });

                const controller = new DataPackagesController();

              await templateService.apiHandler({
                methodName: 'updateDataPackageAudience',
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
        const argsDataPackagesController_updateMissionWriters: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdatePackageWritersRequest"},
        };
        app.put('/api/v1/events/:eventId/data-packages/:packageId/writers',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController)),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController.prototype.updateMissionWriters)),

            async function DataPackagesController_updateMissionWriters(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDataPackagesController_updateMissionWriters, request, response });

                const controller = new DataPackagesController();

              await templateService.apiHandler({
                methodName: 'updateMissionWriters',
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
        const argsDataPackagesController_updateDataPackageTakDelivery: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                packageId: {"in":"path","name":"packageId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdatePackageTakDeliveryRequest"},
        };
        app.put('/api/v1/events/:eventId/data-packages/:packageId/tak-delivery',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController)),
            ...(fetchMiddlewares<RequestHandler>(DataPackagesController.prototype.updateDataPackageTakDelivery)),

            async function DataPackagesController_updateDataPackageTakDelivery(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsDataPackagesController_updateDataPackageTakDelivery, request, response });

                const controller = new DataPackagesController();

              await templateService.apiHandler({
                methodName: 'updateDataPackageTakDelivery',
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
        const argsCombinedExportController_previewCombinedExport: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CombinedExportRequest"},
        };
        app.post('/api/v1/events/:eventId/data-package-exports/atak/preview',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CombinedExportController)),
            ...(fetchMiddlewares<RequestHandler>(CombinedExportController.prototype.previewCombinedExport)),

            async function CombinedExportController_previewCombinedExport(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCombinedExportController_previewCombinedExport, request, response });

                const controller = new CombinedExportController();

              await templateService.apiHandler({
                methodName: 'previewCombinedExport',
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
        const argsCombinedExportController_exportCombinedDataPackage: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                eventId: {"in":"path","name":"eventId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CombinedExportRequest"},
        };
        app.post('/api/v1/events/:eventId/data-package-exports/atak',
            authenticateMiddleware([{"sessionCookie":[]},{"apiClientBearer":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CombinedExportController)),
            ...(fetchMiddlewares<RequestHandler>(CombinedExportController.prototype.exportCombinedDataPackage)),

            async function CombinedExportController_exportCombinedDataPackage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCombinedExportController_exportCombinedDataPackage, request, response });

                const controller = new CombinedExportController();

              await templateService.apiHandler({
                methodName: 'exportCombinedDataPackage',
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
        const argsApiClientsController_listApiClients: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/api-clients',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController)),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController.prototype.listApiClients)),

            async function ApiClientsController_listApiClients(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApiClientsController_listApiClients, request, response });

                const controller = new ApiClientsController();

              await templateService.apiHandler({
                methodName: 'listApiClients',
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
        const argsApiClientsController_createApiClient: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateApiClientRequest"},
        };
        app.post('/api/v1/api-clients',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController)),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController.prototype.createApiClient)),

            async function ApiClientsController_createApiClient(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApiClientsController_createApiClient, request, response });

                const controller = new ApiClientsController();

              await templateService.apiHandler({
                methodName: 'createApiClient',
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
        const argsApiClientsController_getApiClient: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                apiClientId: {"in":"path","name":"apiClientId","required":true,"ref":"Uuid"},
        };
        app.get('/api/v1/api-clients/:apiClientId',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController)),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController.prototype.getApiClient)),

            async function ApiClientsController_getApiClient(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApiClientsController_getApiClient, request, response });

                const controller = new ApiClientsController();

              await templateService.apiHandler({
                methodName: 'getApiClient',
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
        const argsApiClientsController_updateApiClient: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                apiClientId: {"in":"path","name":"apiClientId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateApiClientRequest"},
        };
        app.put('/api/v1/api-clients/:apiClientId',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController)),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController.prototype.updateApiClient)),

            async function ApiClientsController_updateApiClient(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApiClientsController_updateApiClient, request, response });

                const controller = new ApiClientsController();

              await templateService.apiHandler({
                methodName: 'updateApiClient',
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
        const argsApiClientsController_listApiKeys: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                apiClientId: {"in":"path","name":"apiClientId","required":true,"ref":"Uuid"},
                limit: {"in":"query","name":"limit","dataType":"integer","validators":{"isInt":{"errorMsg":"limit"},"minimum":{"value":1},"maximum":{"value":100}}},
                cursor: {"in":"query","name":"cursor","dataType":"string"},
        };
        app.get('/api/v1/api-clients/:apiClientId/api-keys',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController)),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController.prototype.listApiKeys)),

            async function ApiClientsController_listApiKeys(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApiClientsController_listApiKeys, request, response });

                const controller = new ApiClientsController();

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
        const argsApiClientsController_createApiKey: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                apiClientId: {"in":"path","name":"apiClientId","required":true,"ref":"Uuid"},
                body: {"in":"body","name":"body","required":true,"ref":"CreateApiKeyRequest"},
        };
        app.post('/api/v1/api-clients/:apiClientId/api-keys',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController)),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController.prototype.createApiKey)),

            async function ApiClientsController_createApiKey(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApiClientsController_createApiKey, request, response });

                const controller = new ApiClientsController();

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
        const argsApiClientsController_revokeApiKey: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                apiClientId: {"in":"path","name":"apiClientId","required":true,"ref":"Uuid"},
                apiKeyId: {"in":"path","name":"apiKeyId","required":true,"ref":"Uuid"},
        };
        app.post('/api/v1/api-clients/:apiClientId/api-keys/:apiKeyId/revoke',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController)),
            ...(fetchMiddlewares<RequestHandler>(ApiClientsController.prototype.revokeApiKey)),

            async function ApiClientsController_revokeApiKey(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsApiClientsController_revokeApiKey, request, response });

                const controller = new ApiClientsController();

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
        const argsAccountSetupController_completeAccountSetup: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"AccountSetupRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/v1/me/account-setup',
            authenticateMiddleware([{"sessionCookie":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AccountSetupController)),
            ...(fetchMiddlewares<RequestHandler>(AccountSetupController.prototype.completeAccountSetup)),

            async function AccountSetupController_completeAccountSetup(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAccountSetupController_completeAccountSetup, request, response });

                const controller = new AccountSetupController();

              await templateService.apiHandler({
                methodName: 'completeAccountSetup',
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
