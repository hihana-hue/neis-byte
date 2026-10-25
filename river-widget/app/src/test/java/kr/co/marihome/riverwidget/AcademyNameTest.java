package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
public class AcademyNameTest {
 @Test public void preservesNotionNames(){assertEquals("교회",Data.academyName("교회"));assertEquals("피아노",Data.academyName("피아노"));assertEquals("과학",Data.academyName("과학"));assertEquals("바디PT",Data.academyName("바디PT"));}
 @Test public void keepsLegacyAliasAndEmptyFallback(){assertEquals("바디PT",Data.academyName("운동"));assertEquals("일정",Data.academyName(""));assertEquals("일정",Data.academyName(null));}
}
