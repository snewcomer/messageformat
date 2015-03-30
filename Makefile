# Copyright 2012-2015 Alex Sexton, Eemeli Aro, and Contributors
# Licensed under the MIT License

GREEN=\033[32;01m
RED=\033[31;01m
YELLOW=\033[33;01m
STOP=\033[0m
CHK=${GREEN} ✓${STOP}
ERR=${RED} ✖${STOP}

BIN=./node_modules/.bin

.PHONY: test test-browser clean


messageformat.js: lib/message_parser.js lib/messageformat.dev.js
	@sed \
		-e '1i\    // This is generated and pulled in for browsers.' \
		-e 's/module.exports/var mparser/' \
		-e 's/^/    /' \
		$< > ./parser.tmp.js
	@sed \
		-e "/var mparser = require/{r ./parser.tmp.js" \
		-e "d}" \
		$(word 2,$^) > $@
	@rm ./parser.tmp.js
	@echo "${CHK} messageformat.js is now ready for browsers."

lib/message_parser.js: lib/message_parser.pegjs
	@${BIN}/pegjs $< $@
	@echo "${CHK} parser re-compiled by pegjs"


doc: lib/messageformat.dev.js
	@${BIN}/jsdoc -c jsdoc-conf.json
	@echo "${CHK} API documentation generated with jsdoc"

test/common-js-generated-test-fixture.js: bin/messageformat.js messageformat.js example/en/colors.json
	@./$< --module --locale en --include $(word 3,$^) -o $@

test: messageformat.js test/common-js-generated-test-fixture.js
	@${BIN}/mocha --require test/common --reporter spec --growl test/tests.js

test-browser: test/common-js-generated-test-fixture.js
	@open "http://127.0.0.1:3000/test/" & ${BIN}/serve .


clean:
	rm -rf messageformat.js lib/message_parser.js doc/ test/common-js-generated-test-fixture.js
