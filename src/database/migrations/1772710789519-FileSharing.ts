import { MigrationInterface, QueryRunner } from "typeorm";

export class FileSharing1772710789519 implements MigrationInterface {
    name = 'FileSharing1772710789519'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_messages\` ADD \`fileName\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`chat_messages\` ADD \`fileSize\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`chat_messages\` CHANGE \`messageType\` \`messageType\` enum ('text', 'file', 'image', 'video') NOT NULL DEFAULT 'text'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_messages\` CHANGE \`messageType\` \`messageType\` enum ('text') NOT NULL DEFAULT 'text'`);
        await queryRunner.query(`ALTER TABLE \`chat_messages\` DROP COLUMN \`fileSize\``);
        await queryRunner.query(`ALTER TABLE \`chat_messages\` DROP COLUMN \`fileName\``);
    }

}
