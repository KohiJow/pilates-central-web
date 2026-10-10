#!/usr/bin/env python3
"""Reduz as telas de abertura (public/abertura/*.png) a uma paleta de 64 cores.

Uma tela de abertura e um fundo liso com o logo no centro: com paleta, cada arquivo fica cerca
de tres vezes menor (de 1 MB para 350 kB no total) sem diferenca visivel. Rode depois de
`npm run abertura`. Precisa do Pillow (pip install pillow); Python 3.9 serve.
"""
import glob
import os

from PIL import Image

PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'abertura')

antes = depois = 0
for caminho in sorted(glob.glob(os.path.join(PASTA, '*.png'))):
    imagem = Image.open(caminho).convert('RGB')
    paleta = imagem.quantize(colors=64, method=Image.MEDIANCUT, dither=Image.NONE)
    antes += os.path.getsize(caminho)
    paleta.save(caminho, optimize=True)
    depois += os.path.getsize(caminho)
    print('comprimido', os.path.basename(caminho))
print('de %d kB para %d kB' % (antes // 1024, depois // 1024))
