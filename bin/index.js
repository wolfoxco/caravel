const program = require ('commander')

const main = require ('../main.js')

program
	.command('migrate')
	.alias('m')	
	.description('Run migration files in Migration folder if necessary')
	.action(() => {
		main()
	})

program.parse(process.argv)