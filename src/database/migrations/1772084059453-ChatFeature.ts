import { MigrationInterface, QueryRunner } from "typeorm";

export class ChatFeature1772084059453 implements MigrationInterface {
    name = 'ChatFeature1772084059453'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`chat_members\` (\`id\` int NOT NULL AUTO_INCREMENT, \`joinedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`lastReadAt\` timestamp NULL, \`chatId\` int NULL, \`userId\` varchar(36) NULL, UNIQUE INDEX \`IDX_d37a7c4be404903dd6fd46f696\` (\`chatId\`, \`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`chat_messages\` (\`id\` int NOT NULL AUTO_INCREMENT, \`messageType\` enum ('text') NOT NULL DEFAULT 'text', \`content\` text NOT NULL, \`isDeleted\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`chatId\` int NULL, \`senderId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`chats\` (\`id\` int NOT NULL AUTO_INCREMENT, \`type\` enum ('direct', 'group') NOT NULL DEFAULT 'direct', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`creatorId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`chat_members\` ADD CONSTRAINT \`FK_e98bf961346b1b32adf306136c6\` FOREIGN KEY (\`chatId\`) REFERENCES \`chats\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`chat_members\` ADD CONSTRAINT \`FK_23c13a72d263e5f355aef4e2a0d\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`chat_messages\` ADD CONSTRAINT \`FK_e82334881c89c2aef308789c8be\` FOREIGN KEY (\`chatId\`) REFERENCES \`chats\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`chat_messages\` ADD CONSTRAINT \`FK_fc6b58e41e9a871dacbe9077def\` FOREIGN KEY (\`senderId\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`chats\` ADD CONSTRAINT \`FK_9ff8fc297ba6317c88421aecaed\` FOREIGN KEY (\`creatorId\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chats\` DROP FOREIGN KEY \`FK_9ff8fc297ba6317c88421aecaed\``);
        await queryRunner.query(`ALTER TABLE \`chat_messages\` DROP FOREIGN KEY \`FK_fc6b58e41e9a871dacbe9077def\``);
        await queryRunner.query(`ALTER TABLE \`chat_messages\` DROP FOREIGN KEY \`FK_e82334881c89c2aef308789c8be\``);
        await queryRunner.query(`ALTER TABLE \`chat_members\` DROP FOREIGN KEY \`FK_23c13a72d263e5f355aef4e2a0d\``);
        await queryRunner.query(`ALTER TABLE \`chat_members\` DROP FOREIGN KEY \`FK_e98bf961346b1b32adf306136c6\``);
        await queryRunner.query(`DROP TABLE \`chats\``);
        await queryRunner.query(`DROP TABLE \`chat_messages\``);
        await queryRunner.query(`DROP INDEX \`IDX_d37a7c4be404903dd6fd46f696\` ON \`chat_members\``);
        await queryRunner.query(`DROP TABLE \`chat_members\``);
    }

}
