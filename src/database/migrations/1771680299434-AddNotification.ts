import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotification1771680299434 implements MigrationInterface {
    name = 'AddNotification1771680299434'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`notification\` (\`id\` int NOT NULL AUTO_INCREMENT, \`type\` enum ('like', 'comment', 'follow', 'follow_request', 'follow_accept') NOT NULL, \`isRead\` tinyint NOT NULL DEFAULT 0, \`meta\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`recipientId\` varchar(36) NULL, \`actorId\` varchar(36) NULL, \`postId\` int NULL, \`commentId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`notification\` ADD CONSTRAINT \`FK_ab7cbe7a013ecac5da0a8f88884\` FOREIGN KEY (\`recipientId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notification\` ADD CONSTRAINT \`FK_c5133a026bd1b3d9feccac1a234\` FOREIGN KEY (\`actorId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notification\` ADD CONSTRAINT \`FK_c7dc378ca2844fdfe647e00e993\` FOREIGN KEY (\`postId\`) REFERENCES \`post\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notification\` ADD CONSTRAINT \`FK_8dcb425fddadd878d80bf5fa195\` FOREIGN KEY (\`commentId\`) REFERENCES \`comment\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notification\` DROP FOREIGN KEY \`FK_8dcb425fddadd878d80bf5fa195\``);
        await queryRunner.query(`ALTER TABLE \`notification\` DROP FOREIGN KEY \`FK_c7dc378ca2844fdfe647e00e993\``);
        await queryRunner.query(`ALTER TABLE \`notification\` DROP FOREIGN KEY \`FK_c5133a026bd1b3d9feccac1a234\``);
        await queryRunner.query(`ALTER TABLE \`notification\` DROP FOREIGN KEY \`FK_ab7cbe7a013ecac5da0a8f88884\``);
        await queryRunner.query(`DROP TABLE \`notification\``);
    }

}
