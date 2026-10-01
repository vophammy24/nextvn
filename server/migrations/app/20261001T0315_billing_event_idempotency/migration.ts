#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/b595b801f39961e9d44244969935b2b0f09de2a45a5bdbd962d7608abb00a06e/contract';
import endContract from '../../snapshots/b595b801f39961e9d44244969935b2b0f09de2a45a5bdbd962d7608abb00a06e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/de3aa5042daaf02dc37fec642deebf0af20219196663e65419c118c44444d627/contract';
import startContract from '../../snapshots/de3aa5042daaf02dc37fec642deebf0af20219196663e65419c118c44444d627/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'BillingRecord',
        column: col('providerEventId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'BillingRecord',
        constraint: 'BillingRecord_providerEventId_key',
        columns: ['providerEventId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
