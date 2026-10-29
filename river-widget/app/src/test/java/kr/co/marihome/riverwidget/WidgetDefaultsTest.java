package kr.co.marihome.riverwidget;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
public class WidgetDefaultsTest {
 @Test public void defaultSelectionIsUnique()throws Exception{JSONArray a=WidgetDesign.defaults();assertEquals(WidgetDesign.IDS[0],WidgetDesign.initialDefault(a));a.getJSONObject(0).put("isDefault",false);a.getJSONObject(2).put("isDefault",true);assertEquals(WidgetDesign.IDS[2],WidgetDesign.initialDefault(a));a.getJSONObject(1).put("isDefault",true);assertEquals("",WidgetDesign.initialDefault(a));for(int i=0;i<3;i++)a.getJSONObject(i).put("isDefault",false);assertEquals(WidgetDesign.IDS[0],WidgetDesign.initialDefault(a));}
 @Test public void transparencyEndpointsAndClamp(){assertEquals(255,WidgetDesign.alpha(0));assertEquals(128,WidgetDesign.alpha(50));assertEquals(0,WidgetDesign.alpha(100));assertEquals(0,WidgetDesign.alpha(120));assertEquals(255,WidgetDesign.alpha(-5));}
 @Test public void onlySixLessonInternalGapShrinks(){assertEquals(6,LayoutRules.academyBottom(6,true));assertEquals(12,LayoutRules.academyBottom(6,false));assertEquals(12,LayoutRules.academyBottom(3,true));assertEquals(12,LayoutRules.academyBottom(9,true));}
 @Test public void iconKeysAndEmptyChoice(){assertEquals("teen",AcademyIcons.key(" TEEN "));assertEquals("바디pt",AcademyIcons.key("운동"));assertEquals(0,AcademyIcons.resource(""));assertEquals(0,AcademyIcons.resource("unknown"));assertTrue(AcademyIcons.resource("십자가")!=0);}
}
