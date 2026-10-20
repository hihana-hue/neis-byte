package kr.co.marihome.riverwidget;
/** Notion color names select a fixed accessible label pair, independent of widget theme.
 * These pairs approximate the Notion light palette; Notion does not expose UI hex values. */
final class SubjectPalette {
 static int background(String color){switch(color==null?"default":color){
  case "gray":return 0xFFE3E2E0;case "brown":return 0xFFEEE0DA;
  case "orange":return 0xFFFADEC9;case "yellow":return 0xFFFDECC8;
  case "green":return 0xFFDBEDDB;case "blue":return 0xFFD3E5EF;
  case "purple":return 0xFFE8DEEE;case "pink":return 0xFFF5E0E9;
  case "red":return 0xFFFFE2DD;default:return 0xFFE9E9E7;
 }}
 static int foreground(String color){switch(color==null?"default":color){
  case "gray":return 0xFF454340;case "brown":return 0xFF64473A;
  case "orange":return 0xFF854C1D;case "yellow":return 0xFF71551A;
  case "green":return 0xFF2B593F;case "blue":return 0xFF284F6C;
  case "purple":return 0xFF694A7A;case "pink":return 0xFF7D3C60;
  case "red":return 0xFF8A382E;default:return 0xFF37352F;
 }}
 private SubjectPalette(){}
}
