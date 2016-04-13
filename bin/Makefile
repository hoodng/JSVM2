PRJ_PATH = .
JSVM_PATH = $(PRJ_PATH)/../jsvm

JAVA = java

JSCTOOL = $(JAVA) -cp $(PRJ_PATH)/js.jar:$(PRJ_PATH)/tools.jar org.jsvm.javascript.Compiler
CSSTOOL = $(JAVA) -cp $(PRJ_PATH)/tools.jar org.jsvm.css.Compiler

make-js: pack-js compile-js
	$(JSCTOOL) -pkg $(JSVM_PATH) -gzip -verbose

pack-js:
	$(JSCTOOL) -pack $(PRJ_PATH)/pkg.lst -verbose

compile-js:
	$(JSCTOOL) -O 9 -s $(JSVM_PATH)/src -d $(JSVM_PATH)/classes -gzip
	$(JSCTOOL) -O -1 -s $(JSVM_PATH)/lib -d $(JSVM_PATH)/lib -gzip

make-css: pack-css compile-css
	echo "make css package"

pack-css:
	echo "pack-css"

compile-css:
	echo "compile-css"
