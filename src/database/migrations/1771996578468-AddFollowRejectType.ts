import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFollowRejectType1771996578468 implements MigrationInterface {
    name = 'AddFollowRejectType1771996578468'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notification\` CHANGE \`type\` \`type\` enum ('like', 'comment', 'follow', 'follow_request', 'follow_accept', 'follow_reject') NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notification\` CHANGE \`type\` \`type\` enum ('like', 'comment', 'follow', 'follow_request', 'follow_accept') NOT NULL`);
    }

}
