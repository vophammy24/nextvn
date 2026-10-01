#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1dab435ed3f4d969e2a76aac02732cef9ddc98d6d043f161b3578fd3329b4cbf/contract';
import endContract from '../../snapshots/1dab435ed3f4d969e2a76aac02732cef9ddc98d6d043f161b3578fd3329b4cbf/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/31318467eaa714b2c8fbc0aefdb54f4032dbbc70c037b4de1bd2152554d2ea01/contract';
import startContract from '../../snapshots/31318467eaa714b2c8fbc0aefdb54f4032dbbc70c037b4de1bd2152554d2ea01/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'BillingRecord',
        columns: [
          col('amountVnd', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('businessId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('VND'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('paidAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('providerReference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('subscriptionId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'BillingRecord_status_check_7d4c17ff',
            "\"status\" IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'BusinessInvitation',
        columns: [
          col('acceptedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('branchId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('businessId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('invitedByUserId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'BusinessInvitation_role_check_6fc3012b',
            "\"role\" IN ('OWNER', 'MANAGER', 'STAFF')",
          ),
          checkExpression(
            'BusinessInvitation_status_check_c603248a',
            "\"status\" IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'BusinessSettings',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('businessId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('contactEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contactPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('VND'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('locale', 'text', {
            notNull: true,
            default: lit('vi-VN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('notifyLowStock', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('notifyNearExpiry', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('receiptFooter', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('receiptTitle', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('serviceChargeRate', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('taxRate', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['businessId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'BusinessSubscription',
        columns: [
          col('businessId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('periodEndsAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('planId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('providerReference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('startedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('TRIALING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'BusinessSubscription_status_check_f13d23d0',
            "\"status\" IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'SubscriptionPlan',
        columns: [
          col('annualPriceVnd', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('monthlyPriceVnd', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'BusinessMember',
        column: col('branchId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'BusinessMember',
        column: col('status', 'text', {
          notNull: true,
          default: lit('ACTIVE'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'BillingRecord',
        constraint: 'BillingRecord_providerReference_key',
        columns: ['providerReference'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BusinessInvitation',
        constraint: 'BusinessInvitation_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BusinessInvitation',
        constraint: 'BusinessInvitation_businessId_email_key',
        columns: ['businessId', 'email'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'BusinessMember',
        constraint: 'BusinessMember_status_check_ee520df2',
        expression: "\"status\" IN ('ACTIVE', 'INACTIVE')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'BusinessSubscription',
        constraint: 'BusinessSubscription_businessId_key',
        columns: ['businessId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'SubscriptionPlan',
        constraint: 'SubscriptionPlan_code_key',
        columns: ['code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BillingRecord',
        index: 'BillingRecord_businessId_createdAt_idx_776e65e5',
        columns: ['businessId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BillingRecord',
        index: 'BillingRecord_businessId_idx_ae0ed511',
        columns: ['businessId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BillingRecord',
        index: 'BillingRecord_subscriptionId_idx_edbe96bf',
        columns: ['subscriptionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusinessInvitation',
        index: 'BusinessInvitation_branchId_idx_d04da5bb',
        columns: ['branchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusinessInvitation',
        index: 'BusinessInvitation_businessId_idx_ae0ed511',
        columns: ['businessId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusinessInvitation',
        index: 'BusinessInvitation_invitedByUserId_idx_ad3f61d3',
        columns: ['invitedByUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusinessMember',
        index: 'BusinessMember_branchId_idx_d04da5bb',
        columns: ['branchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BusinessSubscription',
        index: 'BusinessSubscription_planId_idx_5b32079a',
        columns: ['planId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BillingRecord',
        foreignKey: {
          name: 'BillingRecord_businessId_fkey',
          columns: ['businessId'],
          references: { schema: 'public', table: 'Business', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BillingRecord',
        foreignKey: {
          name: 'BillingRecord_subscriptionId_fkey',
          columns: ['subscriptionId'],
          references: { schema: 'public', table: 'BusinessSubscription', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusinessInvitation',
        foreignKey: {
          name: 'BusinessInvitation_businessId_fkey',
          columns: ['businessId'],
          references: { schema: 'public', table: 'Business', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusinessInvitation',
        foreignKey: {
          name: 'BusinessInvitation_branchId_fkey',
          columns: ['branchId'],
          references: { schema: 'public', table: 'Branch', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusinessInvitation',
        foreignKey: {
          name: 'BusinessInvitation_invitedByUserId_fkey',
          columns: ['invitedByUserId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusinessMember',
        foreignKey: {
          name: 'BusinessMember_branchId_fkey',
          columns: ['branchId'],
          references: { schema: 'public', table: 'Branch', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusinessSettings',
        foreignKey: {
          name: 'BusinessSettings_businessId_fkey',
          columns: ['businessId'],
          references: { schema: 'public', table: 'Business', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusinessSubscription',
        foreignKey: {
          name: 'BusinessSubscription_businessId_fkey',
          columns: ['businessId'],
          references: { schema: 'public', table: 'Business', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BusinessSubscription',
        foreignKey: {
          name: 'BusinessSubscription_planId_fkey',
          columns: ['planId'],
          references: { schema: 'public', table: 'SubscriptionPlan', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
