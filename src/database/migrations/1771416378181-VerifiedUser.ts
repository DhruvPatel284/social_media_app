import { MigrationInterface, QueryRunner } from "typeorm";

export class VerifiedUser1771416378181 implements MigrationInterface {
    name = 'VerifiedUser1771416378181'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`verificationToken\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`verificationTokenExpiry\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`verificationTokenExpiry\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`verificationToken\``);
    }

}
