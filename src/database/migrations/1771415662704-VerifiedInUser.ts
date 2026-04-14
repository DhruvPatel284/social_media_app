import { MigrationInterface, QueryRunner } from "typeorm";

export class VerifiedInUser1771415662704 implements MigrationInterface {
    name = 'VerifiedInUser1771415662704'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`emailVerified\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`emailVerified\``);
    }

}
