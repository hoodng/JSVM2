#!/bin/sh

CMD="$JAVA_HOME/bin/java -cp tools.jar org.jsvm.css.Compiler"

$CMD -pack ./csspkg.lst -verbose
$CMD -O 9 -s ./style/ -d ./style/ -gzip
$CMD -pkg ./style/ -gzip -verbose

