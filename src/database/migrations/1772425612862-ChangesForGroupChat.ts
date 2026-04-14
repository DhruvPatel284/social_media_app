import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangesForGroupChat1772425612862 implements MigrationInterface {
    name = 'ChangesForGroupChat1772425612862'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chats\` ADD \`name\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chats\` DROP COLUMN \`name\``);
    }

}
