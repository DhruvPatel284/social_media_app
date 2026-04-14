import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostMedia1770975283410 implements MigrationInterface {
    name = 'AddPostMedia1770975283410'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`post_media\` (\`id\` int NOT NULL AUTO_INCREMENT, \`filename\` varchar(255) NOT NULL, \`type\` enum ('image', 'video') NOT NULL, \`display_order\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`postId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`post_media\` ADD CONSTRAINT \`FK_4adcc5190e3b5c7e9001adef3b8\` FOREIGN KEY (\`postId\`) REFERENCES \`post\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`post_media\` DROP FOREIGN KEY \`FK_4adcc5190e3b5c7e9001adef3b8\``);
        await queryRunner.query(`DROP TABLE \`post_media\``);
    }

}
