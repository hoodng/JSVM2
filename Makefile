
MAKE = make

PRJ_PATH =.
JAR = jar

war: compile make-js make-css
	$(JAR) -cf $(PRJ_PATH)/webos.war Makefile app/ bin/ jsvm/ style/ WEB-INF/

compile:
	cd $(PRJ_PATH)/WEB-INF && $(MAKE) build

maketools:
	cd $(PRJ_PATH)/WEB-INF && $(MAKE) maketools

make-js:
	cd $(PRJ_PATH)/bin && $(MAKE) make-js

make-css:
	cd $(PRJ_PATH)/bin && $(MAKE) make-css

