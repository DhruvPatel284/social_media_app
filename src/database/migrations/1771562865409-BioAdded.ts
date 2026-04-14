import { MigrationInterface, QueryRunner } from "typeorm";

export class BioAdded1771562865409 implements MigrationInterface {
    name = 'BioAdded1771562865409'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`bio\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`bio\``);
    }

}
