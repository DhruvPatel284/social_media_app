import { MigrationInterface, QueryRunner } from "typeorm";

export class NotificationForGroup1772429594539 implements MigrationInterface {
    name = 'NotificationForGroup1772429594539'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notification\` CHANGE \`type\` \`type\` enum ('like', 'comment', 'follow', 'follow_request', 'follow_accept', 'follow_reject', 'group_add', 'group_remove') NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notification\` CHANGE \`type\` \`type\` enum ('like', 'comment', 'follow', 'follow_request', 'follow_accept', 'follow_reject') NOT NULL`);
    }

}
