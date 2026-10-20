package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
public class SubjectPaletteTest {
 private double component(int n){double v=n/255.0;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}
 private double light(int c){return .2126*component((c>>16)&255)+.7152*component((c>>8)&255)+.0722*component(c&255);}
 @Test public void labelsRemainReadableInEveryTheme(){for(String name:new String[]{"default","gray","brown","orange","yellow","green","blue","purple","pink","red"}){int bg=SubjectPalette.background(name),fg=SubjectPalette.foreground(name);double a=light(bg),b=light(fg);assertTrue(name,(Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);}}
 @Test public void missingOrUnknownColorUsesNeutralPair(){assertEquals(SubjectPalette.background("default"),SubjectPalette.background(null));assertEquals(SubjectPalette.foreground("default"),SubjectPalette.foreground("future-color"));}
 @Test public void greenAndDefaultAreDifferent(){assertNotEquals(SubjectPalette.background("green"),SubjectPalette.background("default"));}
}
