Attribute VB_Name = "FormatMinei"
Sub formatMinei()
Attribute formatMinei.VB_ProcData.VB_Invoke_Func = "Normal.FormatMinei.formatMinei"
'
' Форматируем службу минеи
'
'
    Dim sEditor
    
    
    Set fs = CreateObject("Scripting.FileSystemObject")
    
    If fs.FileExists("C:\Program Files\Notepad++\notepad++.exe") Then
        sEditor = "C:\Program Files\Notepad++\notepad++.exe"
    Else
        sEditor = "notepad.exe"
    End If
    
    Selection.Find.ClearFormatting
    With Selection.Find.Font
        .Bold = True
        .Color = wdColorAutomatic
    End With
    With Selection.Find.ParagraphFormat
        .SpaceBeforeAuto = False
        .SpaceAfterAuto = False
        .Alignment = wdAlignParagraphCenter
        
    End With
    Selection.Find.Replacement.ClearFormatting
    With Selection.Find
        .Text = ""
        .Replacement.Text = "## ^&^0013"
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
           
    ActiveDocument.SaveAs2 _
        FileName:=ActiveDocument.FullName & ".txt", _
        FileFormat:=wdFormatTextLineBreaks, _
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
        
    Call Shell(sEditor & " " & ActiveDocument.FullName, vbNormalFocus)
End Sub

