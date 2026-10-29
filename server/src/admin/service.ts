import { randomUUID } from 'node:crypto';
import { db } from '../prisma/db.js';

export class AdminConflict extends Error {}
type Database = typeof db;
export function createAdminService(database: Database = db) {
  return {
    async review(
      id: string,
      actorId: string,
      status: 'APPROVED' | 'REJECTED',
      reason: string | undefined,
      correlationId: string,
    ) {
      if (status === 'REJECTED' && !reason?.trim())
        throw new AdminConflict('Cần nhập lý do từ chối.');
      return database.transaction(async (tx) => {
        const locked = await tx.query(
          database.raw
            .sql`SELECT id FROM public."BusinessApplication" WHERE id = ${id}::uuid FOR UPDATE`
            .returnsRow({ id: 'pg/uuid@1' })
            .build(),
        );
        if (!locked.length) throw new AdminConflict('Hồ sơ không tồn tại.');
        const application = await tx.orm.public.BusinessApplication.where({ id }).first();
        if (!application || application.status !== 'PENDING')
          throw new AdminConflict('Hồ sơ đã được xử lý. Vui lòng tải lại.');
        const business = await tx.orm.public.Business.where({ id: application.businessId }).first();
        if (!business || business.approvalStatus !== 'PENDING')
          throw new AdminConflict('Trạng thái doanh nghiệp không hợp lệ.');
        await tx.orm.public.BusinessApplication.where({ id, status: 'PENDING' }).update({
          status,
          reviewerId: actorId,
          reviewedAt: new Date().toISOString(),
          reviewReason: reason ?? null,
        });
        await tx.orm.public.Business.where({
          id: application.businessId,
          approvalStatus: 'PENDING',
        }).update({ approvalStatus: status });
        await tx.orm.public.AdminAuditEvent.create({
          id: randomUUID(),
          actorId,
          action: `APPLICATION_${status}`,
          entityType: 'Business',
          entityId: application.businessId,
          previousStatus: 'PENDING',
          newStatus: status,
          reason: reason ?? null,
          correlationId,
        });
        return { id, status };
      });
    },
    async operation(
      id: string,
      actorId: string,
      status: 'ACTIVE' | 'SUSPENDED',
      reason: string,
      correlationId: string,
    ) {
      if (!reason.trim()) throw new AdminConflict('Cần nhập lý do thay đổi.');
      return database.transaction(async (tx) => {
        const locked = await tx.query(
          database.raw.sql`SELECT id FROM public."Business" WHERE id = ${id}::uuid FOR UPDATE`
            .returnsRow({ id: 'pg/uuid@1' })
            .build(),
        );
        if (!locked.length) throw new AdminConflict('Doanh nghiệp không tồn tại.');
        const business = await tx.orm.public.Business.where({ id }).first();
        if (
          !business ||
          business.approvalStatus !== 'APPROVED' ||
          business.operationalStatus === status
        )
          throw new AdminConflict('Thay đổi trạng thái không hợp lệ.');
        await tx.orm.public.Business.where({ id }).update({ operationalStatus: status });
        await tx.orm.public.AdminAuditEvent.create({
          id: randomUUID(),
          actorId,
          action: `BUSINESS_${status}`,
          entityType: 'Business',
          entityId: id,
          previousStatus: business.operationalStatus,
          newStatus: status,
          reason,
          correlationId,
        });
        return { id, operationalStatus: status };
      });
    },
  };
}
