#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1dab435ed3f4d969e2a76aac02732cef9ddc98d6d043f161b3578fd3329b4cbf/contract';
import startContract from '../../snapshots/1dab435ed3f4d969e2a76aac02732cef9ddc98d6d043f161b3578fd3329b4cbf/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/de3aa5042daaf02dc37fec642deebf0af20219196663e65419c118c44444d627/contract';
import endContract from '../../snapshots/de3aa5042daaf02dc37fec642deebf0af20219196663e65419c118c44444d627/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'BusinessSettings',
        column: col('invoicePrefix', 'text', {
          notNull: true,
          default: lit('NEXTVN'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
