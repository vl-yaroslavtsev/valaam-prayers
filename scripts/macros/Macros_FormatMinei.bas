Attribute VB_Name = "FormatMinei"
Sub formatMinei()
Attribute formatMinei.VB_ProcData.VB_Invoke_Func = "Normal.FormatMinei.formatMinei"
'
' Форматируем службу минеи
'
'
    Selection.Find.Replacement.ClearFormatting
    Selection.Find.Replacement.Font.Color = wdColorAutomatic
    Selection.Find.ClearFormatting
    With Selection.Find
        .Font.Color = wdColorRed
        .Text = "^0013"
        .Replacement.Text = "^&"
        .Forward = True
        .Wrap = wdFindContinue
        .Format = True
        .MatchCase = False
        .MatchWholeWord = False
        .MatchAllWordForms = False
        .MatchSoundsLike = False
        .MatchWildcards = True
    End With
    Selection.Find.Execute Replace:=wdReplaceAll
    
    
    Selection.Find.Replacement.ClearFormatting
    Selection.Find.ClearFormatting
    With Selection.Find
        .Font.Color = wdColorRed
        .Text = ""
        .Replacement.Text = "**^&**"
        .Forward = True
        .Wrap = wdFindContinue
        .Format = True
        .MatchCase = False
        .MatchWholeWord = False
        .MatchWildcards = False
        .MatchSoundsLike = False
        .MatchAllWordForms = False
    End With
    Selection.Find.Execute Replace:=wdReplaceAll
    
    
    Selection.Find.Replacement.ClearFormatting
    Selection.Find.ClearFormatting
    With Selection.Find
        .Font.Color = wdColorRed
        .Text = "(^0032@)\*\*"
        .Replacement.Text = "**\1"
        .Forward = True
        .Wrap = wdFindContinue
        .Format = True
        .MatchCase = False
        .MatchWholeWord = False
        .MatchAllWordForms = False
        .MatchSoundsLike = False
        .MatchWildcards = True
    End With
    Selection.Find.Execute Replace:=wdReplaceAll
    
   
    Selection.Find.Replacement.ClearFormatting
    Selection.Find.ClearFormatting
    With Selection.Find
        .Text = "([!^0013])^0013([!^0013])"
        .Replacement.Text = "\1^0013^0013\2"
        .Forward = True
        .Wrap = wdFindContinue
        .Format = False
        .MatchCase = False
        .MatchWholeWord = False
        .MatchAllWordForms = False
        .MatchSoundsLike = False
        .MatchWildcards = True
    End With
    Selection.Find.Execute Replace:=wdReplaceAll
        
        Selection.Find.ClearFormatting
    Selection.Find.Replacement.ClearFormatting
    With Selection.Find
        .Text = "(^0013)\*\*(?)\*\*"
        .Replacement.Text = "\1\2"
        .Forward = True
        .Wrap = wdFindContinue
        .Format = False
        .MatchCase = False
        .MatchWholeWord = False
        .MatchAllWordForms = False
        .MatchSoundsLike = False
        .MatchWildcards = True
    End With
    Selection.Find.Execute Replace:=wdReplaceAll
    
   
    Selection.Find.ClearFormatting
    Selection.Find.Replacement.ClearFormatting
    With Selection.Find
        .Font.Italic = True
        .Text = ""
        .Replacement.Text = "_^&_"
        .Forward = True
        .Wrap = wdFindContinue
        .Format = True
        .MatchCase = False
        .MatchWholeWord = False
        .MatchWildcards = False
        .MatchSoundsLike = False
        .MatchAllWordForms = False
    End With
    Selection.Find.Execute Replace:=wdReplaceAll
    
    Selection.Find.ClearFormatting
    Selection.Find.Replacement.ClearFormatting
    With Selection.Find.Replacement.Font
        .Bold = False
        .Italic = False
    End With
    With Selection.Find
        .Font.Italic = True
        .Text = "(^0013@)_"
        .Replacement.Text = "_\1"
        .Forward = True
        .Wrap = wdFindContinue
        .Format = True
        .MatchCase = False
        .MatchWholeWord = False
        .MatchAllWordForms = False
        .MatchSoundsLike = False
        .MatchWildcards = True
    End With
    Selection.Find.Execute Replace:=wdReplaceAll
    
    Selection.Find.ClearFormatting
    Selection.Find.Replacement.ClearFormatting
    With Selection.Find
        .Text = "****"
        .Replacement.Text = ""
        .Forward = True
        .Wrap = wdFindContinue
        .Format = False
        .MatchCase = False
        .MatchWholeWord = False
        .MatchWildcards = False
        .MatchSoundsLike = False
        .MatchAllWordForms = False
    End With
    Selection.Find.Execute Replace:=wdReplaceAll
    
    Selection.Find.ClearFormatting
    Selection.Find.Replacement.ClearFormatting
    With Selection.Find
        .Text = "\*\*(^0032@)\*\*"
        .Replacement.Text = "\1"
        .Forward = True
        .Wrap = wdFindContinue
        .Format = False
        .MatchCase = False
        .MatchWholeWord = False
        .MatchWildcards = True
        .MatchSoundsLike = False
        .MatchAllWordForms = False
    End With
    Selection.Find.Execute Replace:=wdReplaceAll
        
    Selection.WholeStory
    With Selection.ParagraphFormat
        .SpaceBeforeAuto = False
        .SpaceAfterAuto = False
        .FirstLineIndent = CentimetersToPoints(0)
    End With
	
	 Dim arrName() As String
    
    arrName = Split(ActiveDocument.FullName, ".")
    arrName(UBound(arrName)) = "txt"
   
    ActiveDocument.SaveAs2 _
        FileName:=Join(arrName, "."), _
        FileFormat:=wdFormatText, _
        Encoding:=65001, _
        LockComments:=False, _
        Password:="", _
        AddToRecentFiles:=True, _
        WritePassword:="", _
        ReadOnlyRecommended:=False, _
        EmbedTrueTypeFonts:=False, _
        SaveNativePictureFormat:=False, _
        SaveFormsData:=False, _
        SaveAsAOCELetter:=False, _
        InsertLineBreaks:=False, _
        AllowSubstitutions:=False, _
        LineEnding:=wdCRLF, CompatibilityMode:=0
End Sub