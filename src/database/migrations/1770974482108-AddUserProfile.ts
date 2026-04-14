import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserProfile1770974482108 implements MigrationInterface {
    name = 'AddUserProfile1770974482108'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`profile_image\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`profile_image\``);
    }

}
