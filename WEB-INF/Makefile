PRJ_PATH=.

JAVAC = javac
JAR = jar
JAVASRC_PATH=${PRJ_PATH}/src
JAVADES_PATH=${PRJ_PATH}/classes
JAVAJAR_PATH=${PRJ_PATH}/../bin/js.jar:${PRJ_PATH}/lib/servlet-api.zar
JAVA_OPTIONS=-encoding UTF-8
JVM=1.6

build: source
	$(JAVAC) $(JAVA_OPTIONS) -classpath $(JAVAJAR_PATH):$(JAVADES_PATH):$(JAVASRC_PATH): \
	-d $(JAVADES_PATH) @$(PRJ_PATH)/source.list -target $(JVM) -source $(JVM)
	rm -f $(PRJ_PATH)/source.list

source:
	find $(JAVASRC_PATH) -name *.java >$(PRJ_PATH)/source.list

clean:
	rm -rf $(JAVADES_PATH)/*

maketools: 
	$(JAR) -cf ${PRJ_PATH}/../bin/tools.jar -C $(JAVADES_PATH)/ .

